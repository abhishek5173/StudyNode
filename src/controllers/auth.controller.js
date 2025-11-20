const User = require("../models/User");
const bcrypt = require("bcryptjs");
const generateToken = require("../utils/generateToken");

// REGISTER

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const exisitng = await User.findOne({ email });
    if (exisitng) {
      return res.status(400).json({ message: "User already exists" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      passwordHash: hashedPassword,
    });

    res.json({
      token: generateToken(user._id, user.email),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "User Doesn't exist" });
        }
        const valid = await user.comparePassword(password);
        if (!valid) {
            return res.status(400).json({ message: "Invalid Credentials" });
        }
        res.json({
            token: generateToken(user._id, user.email),
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
            },
        });
    } catch (error) {
      console.log(error);
        res.status(500).json({ message: "Server error" });
    }
}