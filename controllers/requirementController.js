const Requirement = require("../models/Requirement");

exports.createRequirement = async (req, res) => {
  const reqData = await Requirement.create(req.body);
  res.json(reqData);
};

exports.getRequirements = async (req, res) => {
  const data = await Requirement.find();
  res.json(data);
};