// Authentication controller
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { Op } = require('sequelize');
const User = require('../models/User');
const Chef = require('../models/Chef');

// Initialize Google OAuth Client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Register Admin/User
exports.register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
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
      return res.status(400).json({ error: 'Email already registered' });
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

