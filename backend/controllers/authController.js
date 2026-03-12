// Authentication controller
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { Op } = require('sequelize');
const User = require('../models/User');
const Chef = require('../models/Chef');
const PasswordReset = require('../models/PasswordReset');
const { sendResetEmail } = require('../utils/mailer');

// Initialize Google OAuth Client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const PASSWORD_MIN_LENGTH = 8;
const RESET_TOKEN_TTL_MINUTES = 15;

function hashResetToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Register Admin/User
exports.register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Registration failed' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: role || 'user'
    });

    // Generate token
    const token = jwt.sign(
      { userId: user.id, role: user.role, userType: 'user' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Register Chef
exports.registerChef = async (req, res) => {
  try {
    const { name, email, password, phone, address, specialties, bio } = req.body;

    // Check if chef exists
    const existingChef = await Chef.findOne({ where: { email } });
    if (existingChef) {
      return res.status(400).json({ error: 'Registration failed' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create chef
    const chef = await Chef.create({
      name,
      email,
      password: hashedPassword,
      phone,
      address,
      specialties,
      bio
    });

    // Generate token
    const token = jwt.sign(
      { userId: chef.id, role: 'chef', userType: 'chef' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'Chef registered successfully',
      token,
      chef: {
        id: chef.id,
        name: chef.name,
        email: chef.email,
        role: 'chef'
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Login (auto-detect Chef or User by email)
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find both User and Chef in parallel to decide who this email belongs to
    const [dbUser, chef] = await Promise.all([
      User.findOne({ where: { email } }),
      Chef.findOne({ where: { email } })
    ]);

    let user = null;
    let tokenData = null;

    // Prioritize admin User if exists
    if (dbUser && dbUser.role === 'admin') {
      const isPasswordValid = await bcrypt.compare(password, dbUser.password);
      if (!isPasswordValid) {
        console.warn(`Failed admin login attempt for ${email}`);
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      user = dbUser;
      tokenData = { userId: dbUser.id, role: dbUser.role || 'user', userType: 'user' };
    } else if (chef) {
      // If not admin, prefer chef account when present
      const isPasswordValid = await bcrypt.compare(password, chef.password);
      if (!isPasswordValid) {
        console.warn(`Failed chef login attempt for ${email}`);
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      user = chef;
      tokenData = { userId: chef.id, role: 'chef', userType: 'chef' };
    } else if (dbUser) {
      // Fallback to regular user
      const isPasswordValid = await bcrypt.compare(password, dbUser.password);
      if (!isPasswordValid) {
        console.warn(`Failed user login attempt for ${email}`);
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      user = dbUser;
      tokenData = { userId: dbUser.id, role: dbUser.role || 'user', userType: 'user' };
    } else {
      // No account found
      console.warn(`Login attempt for non-existent account: ${email}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign(tokenData, process.env.JWT_SECRET, { expiresIn: '24h' });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: tokenData.role
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Google OAuth Login
exports.googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ error: 'Google credential is required' });
    }

    // Verify Google token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    if (!email) {
      return res.status(400).json({ error: 'Email not provided by Google' });
    }

    // Check if user exists by Google ID or email
    let user = null;
    let userType = null;

    // Check User table first
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [
          { googleId },
          { email }
        ]
      }
    });

    // Check Chef table
    const existingChef = await Chef.findOne({
      where: {
        [Op.or]: [
          { googleId },
          { email }
        ]
      }
    });

    // Prioritize admin User if exists
    if (existingUser && existingUser.role === 'admin') {
      // Update Google ID if not set
      if (!existingUser.googleId) {
        existingUser.googleId = googleId;
        await existingUser.save();
      }
      user = existingUser;
      userType = 'user';
    } else if (existingChef) {
      // Update Google ID if not set
      if (!existingChef.googleId) {
        existingChef.googleId = googleId;
        await existingChef.save();
      }
      user = existingChef;
      userType = 'chef';
    } else if (existingUser) {
      // Update Google ID if not set
      if (!existingUser.googleId) {
        existingUser.googleId = googleId;
        await existingUser.save();
      }
      user = existingUser;
      userType = 'user';
    } else {
      // Create new user account (default to regular user)
      user = await User.create({
        name,
        email,
        googleId,
        password: null, // No password for OAuth users
        role: 'user'
      });
      userType = 'user';
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        role: userType === 'chef' ? 'chef' : (user.role || 'user'),
        userType
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Google login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: userType === 'chef' ? 'chef' : (user.role || 'user'),
        picture: picture || null
      }
    });
  } catch (error) {
    console.error('Google OAuth error:', error);
    res.status(500).json({ error: error.message || 'Google authentication failed' });
  }
};

// Change password (authenticated users only)
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmNewPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (newPassword.length < PASSWORD_MIN_LENGTH) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }

    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({ error: 'Confirm password does not match' });
    }

    const AccountModel = req.userType === 'chef' ? Chef : User;
    const account = await AccountModel.findByPk(req.userId);

    if (!account || !account.password) {
      return res.status(400).json({ error: 'Unable to change password' });
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, account.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ error: 'Unable to change password' });
    }

    const isSameAsCurrent = await bcrypt.compare(newPassword, account.password);
    if (isSameAsCurrent) {
      return res.status(400).json({ error: 'New password must be different from current password' });
    }

    account.password = await bcrypt.hash(newPassword, 10);
    await account.save();

    return res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({ error: 'Unable to process request' });
  }
};

// Forgot password (always returns generic response to prevent email enumeration)
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = (email || '').trim().toLowerCase();

    const genericResponse = {
      message: 'A verification code has been sent to your email'
    };

    if (!normalizedEmail) {
      return res.json(genericResponse);
    }

    const user = await User.findOne({ where: { email: normalizedEmail } });
    if (!user) {
      return res.json(genericResponse);
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const tokenHash = hashResetToken(otp);
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);

    // Keep reset tokens single-use and short-lived.
    await PasswordReset.destroy({
      where: {
        [Op.or]: [{ userId: user.id }, { expiresAt: { [Op.lte]: new Date() } }]
      }
    });

    await PasswordReset.create({
      userId: user.id,
      token: tokenHash,
      expiresAt
    });

    // Send email via mail provider. Do not surface errors to the client.
    try {
      await sendResetEmail(user.email, otp);
    } catch (mailError) {
      console.error('Failed to send reset email:', mailError);
    }

    return res.json(genericResponse);
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({ error: 'Unable to process request' });
  }
};

// OTP flow does not require token validation.
exports.validateResetToken = async (req, res) => {
  try {
    return res.status(410).json({ error: 'Invalid or expired code' });
  } catch (error) {
    console.error('Validate reset token error:', error);
    return res.status(500).json({ error: 'Unable to process request' });
  }
};

// Reset password using OTP
exports.resetPassword = async (req, res) => {
  try {
    const { otp, newPassword, confirmNewPassword } = req.body;

    if (!otp || !newPassword || !confirmNewPassword) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (!/^\d{6}$/.test(String(otp))) {
      return res.status(400).json({ error: 'Invalid or expired code' });
    }

    if (newPassword.length < PASSWORD_MIN_LENGTH) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }

    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({ error: 'Confirm password does not match' });
    }

    const tokenHash = hashResetToken(String(otp));
    const resetRecord = await PasswordReset.findOne({
      where: {
        token: tokenHash,
        expiresAt: { [Op.gt]: new Date() }
      }
    });

    if (!resetRecord) {
      return res.status(400).json({ error: 'Invalid or expired code' });
    }

    // timingSafeEqual defends against subtle token comparison timing leaks.
    const left = Buffer.from(resetRecord.token, 'hex');
    const right = Buffer.from(tokenHash, 'hex');
    if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) {
      return res.status(400).json({ error: 'Invalid or expired code' });
    }

    const user = await User.findByPk(resetRecord.userId);
    if (!user) {
      await PasswordReset.destroy({ where: { id: resetRecord.id } });
      return res.status(400).json({ error: 'Invalid or expired code' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    // Single-use token: delete all active reset tokens for this user after success.
    await PasswordReset.destroy({ where: { userId: user.id } });

    return res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ error: 'Unable to process request' });
  }
};

// Get current user
exports.getMe = async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    let user;
    if (decoded.userType === 'chef') {
      user = await Chef.findByPk(decoded.userId);
    } else {
      user = await User.findByPk(decoded.userId);
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: decoded.userType === 'chef' ? 'chef' : user.role,
        phone: user.phone,
        address: user.address
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

