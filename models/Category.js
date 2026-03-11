const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({

  categoryTitle: String,

  categoryStatus: {
    type: Boolean,
    default: true
  },

  isDeleted: {
    type: Boolean,
    default: false
  }

});

module.exports = mongoose.model("Category", categorySchema);