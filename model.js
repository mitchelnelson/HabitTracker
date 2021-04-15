const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define Schema
const habitSchema = new Schema(
	{
		name: String,
		startDate: String,
		daysSinceStart: Number,
		currentStreak: Number,
		checkedInToday: Boolean
	},
	{
		timestamps: true
	}
);

const allToggleSchema = new Schema({
	toggled: Boolean,
	isUpdated: Boolean
});

// Define Model
const Habit = mongoose.model('Habit', habitSchema);
const Toggle = mongoose.model('Toggle', allToggleSchema);

// Export Model
module.exports = { Habit, Toggle };
