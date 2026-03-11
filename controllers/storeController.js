const Store = require("../models/Store");

exports.createStore = async (req, res) => {
  try {
    const store = await Store.create(req.body);
    res.json(store);
  } catch (err) {
    res.status(500).json(err);
  }
};

exports.getStores = async (req, res) => {
  const stores = await Store.find();
  res.json(stores);
};

exports.getStore = async (req, res) => {
  const store = await Store.findById(req.params.id);
  res.json(store);
};

exports.updateStore = async (req, res) => {
  const store = await Store.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true }
  );

  res.json(store);
};

exports.deleteStore = async (req, res) => {
  await Store.findByIdAndDelete(req.params.id);
  res.json({ message: "Store deleted" });
};