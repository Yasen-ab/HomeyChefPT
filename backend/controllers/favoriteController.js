const Favorite = require('../models/Favorite');
const Dish = require('../models/Dish');
const Chef = require('../models/Chef');

exports.addFavorite = async (req, res) => {
  try {
    if (req.role !== 'user') {
      return res.status(403).json({ error: 'Only users can manage favorites' });
    }

    const { dishId } = req.body;
    if (!dishId) {
      return res.status(400).json({ error: 'dishId is required' });
    }

    const dish = await Dish.findByPk(dishId);
    if (!dish) {
      return res.status(404).json({ error: 'Dish not found' });
    }

    const [favorite, created] = await Favorite.findOrCreate({
      where: { userId: req.userId, dishId }
    });

    const payload = { favorite, created };
    if (!created) {
      return res.status(200).json(payload);
    }

    res.status(201).json(payload);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.removeFavorite = async (req, res) => {
  try {
    if (req.role !== 'user') {
      return res.status(403).json({ error: 'Only users can manage favorites' });
    }

    const { dishId } = req.params;
    await Favorite.destroy({
      where: { userId: req.userId, dishId }
    });

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getFavorites = async (req, res) => {
  try {
    if (req.role !== 'user') {
      return res.status(403).json({ error: 'Only users can manage favorites' });
    }

    const favorites = await Favorite.findAll({
      where: { userId: req.userId },
      include: [
        {
          model: Dish,
          attributes: ['id', 'name', 'description', 'price', 'image', 'isAvailable', 'chefId'],
          include: [{ model: Chef, as: 'Chef', attributes: ['id', 'name'] }]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      favorites: favorites.map((favorite) => favorite.toJSON())
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
