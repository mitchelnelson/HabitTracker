// Libraries
const rl = require('readline-sync');
const mongoose = require('mongoose');

// Models
const { Habit, Toggle } = require('./model');

// Connect to local mongoDB database
mongoose.connect('mongodb://localhost:27017/HabitTracker', {
	useNewUrlParser: true,
	useUnifiedTopology: true,
	useFindAndModify: false,
	useCreateIndex: true
});

// Establish a database connection using Mongoose.
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function () {
	console.log('');
});

//////////////////////////////////////////////////////////////////////////////////

// Variable declarations

const months = {
	0: 'January',
	1: 'February',
	2: 'March',
	3: 'April',
	4: 'May',
	5: 'June',
	6: 'July',
	7: 'August',
	8: 'September',
	9: 'October',
	10: 'November',
	11: 'December'
};

const questions = [
	'Daily check-in',
	'Create a habit',
	'View existing habits.',
	'Edit/Delete habits.'
];

const underliner =
	'\u001b[38;5;28;1;4mPress a corresponding key from below to get started:\033[m';

const qPrompt = `${underliner}\n
1. ${questions[0]}
2. ${questions[1]}
3. ${questions[2]}
4. ${questions[3]}
q. Exit app.\n\n`;

// Main function

function greet () {
	dailyIncrement();
	clearConsoleAndScrollBuffer();

	let answer = rl.keyIn(qPrompt, { limit: ['1', '2', '3', '4', 'q'] });

	switch (answer) {
		case '1':
			clearConsoleAndScrollBuffer();
			return checkIn();
		case '2':
			clearConsoleAndScrollBuffer();
			return createHabits(answer);
		case '3':
			clearConsoleAndScrollBuffer();
			return readHabits(answer);
		case '4':
			clearConsoleAndScrollBuffer();
			return updateHabits(answer);
		// case '4':
		case 'q':
			return goodbye();
	}
}

// Check-in functions

// Main check-in controller
async function checkIn () {
	displayAnswer(1);
	console.log(' (Select an option from below)');

	let array = [];
	let results = await Habit.find({});
	addToArray(results, array, [], true);

	let chosenHabit = rl.keyInSelect(array, '', {
		hideEchoBack: true,
		mask: '',
		cancel: '\u001b[1mGo Back to Menu.\033[m'
	});

	if (chosenHabit === array.indexOf('CANCEL')) {
		return greet();
	}
	else if (chosenHabit === array.indexOf('Toggle All')) {
		return ToggleAll(results);
	}
	else {
		return habitToggle(results, chosenHabit, true);
	}
}

// Takes in a habit and updates its current streak and check-in status for the day.
async function habitToggle (data, specificHabit, isSpecific) {
	if (data[specificHabit]['checkedInToday'] === false) {
		await Habit.findOneAndUpdate(
			{ name: data[specificHabit]['name'] },
			{
				$set: {
					checkedInToday: true
				},
				$inc: { currentStreak: 1 }
			}
		);
	}
	else {
		await Habit.findOneAndUpdate(
			{ name: data[specificHabit]['name'] },
			{
				$set: {
					checkedInToday: false
				},
				$inc: { currentStreak: -1 }
			}
		);
	}

	if (isSpecific) {
		clearConsoleAndScrollBuffer();
		return checkIn();
	}
}

// Checks database to see if all habits are toggled; updates current streak/check-in as necessary.
async function ToggleAll (data) {
	let result = await grabToggleData();
	if (result === false) {
		await Habit.updateMany({}, { $set: { checkedInToday: true } });
		await Toggle.updateOne({}, { toggled: true });
	}
	else {
		await Habit.updateMany({}, { $set: { checkedInToday: false } });
		await Toggle.updateOne({}, { toggled: false });
	}

	for (i = 0; i < data.length; i++) {
		habitToggle(data, i, false);
	}

	clearConsoleAndScrollBuffer();
	return checkIn();
}

// CRU(D)

// Creates a new habit and saves it to database.
async function createHabits (option) {
	displayAnswer(option);

	console.log(' (Select an option from below)');
	let confirm = rl.keyInSelect(['Create Habit'], '', {
		hideEchoBack: true,
		mask: '',
		cancel: '\u001b[1mGo Back to Menu.\033[m'
	});

	if (confirm === 0) {
		let entry = rl.question('Enter habit: ');
		const newHabit = new Habit({
			name: entry,
			startDate: customDate(Date.now()),
			daysSinceStart: 0,
			currentStreak: 0,
			checkedInToday: false
		});
		await newHabit.save().then(() => {
			process.stdout.write(
				'\033[1;31mHabit added!\033[m (Returning to main menu)'
			);
			setTimeout(() => {
				return greet();
			}, 2500);
		});
	}
	else return greet();
}

// Queries database and logs all habits to the console.
async function readHabits (option) {
	displayAnswer(option);
	console.log(' (Hit \u001b[1;4mspacebar\033[m to go back)');
	let results = await Habit.find();

	logHabitData(results);
	return spacebarMainMenu();
}

// Main controller for the update 'page'.
async function updateHabits (option) {
	displayAnswer(option);
	console.log(' (Select a habit from below to edit)');

	const habitArray = [];
	const indexArray = [];

	let data = await Habit.find();
	addToArray(data, habitArray, indexArray, false);

	let chosenHabit = rl.keyInSelect(habitArray, '', {
		hideEchoBack: true,
		mask: '',
		cancel: '\u001b[1mGo Back to Menu.\033[m'
	});

	if (chosenHabit === -1) {
		return greet();
	}
	else {
		return openHabitEditor(habitArray[chosenHabit]);
	}
}

// Read-specific functions

// Takes habit data from database and logs it to console with unicode styling.
function logHabitData (data) {
	for (let i = 0; i < data.length; i++) {
		console.log('\n\033[38;5;184m✏️  Habit: \033[m' + data[i]['name']);

		console.log(
			'\033[38;5;25m✅ Checked In Today?: \033[m' +
				data[i]['checkedInToday']
		);
		if (data[i]['daysSinceStart'] === 0) {
			console.log(
				'\033[38;5;197m📅 Start Date: \033[m' +
					`${data[i]['startDate']} (today)`
			);
		}
		if (data[i]['daysSinceStart'] !== 0) {
			console.log(
				'\033[38;5;197m📅 Start Date: \033[m' +
					`${data[i]['startDate']} (${data[i][
						'daysSinceStart'
					]} days ago)`
			);
		}
		if (data[i]['currentStreak'] === 1) {
			console.log(
				'\033[38;5;166m🔥 Current Streak: \033[m' +
					data[i]['currentStreak'] +
					' day'
			);
		}
		if (data[i]['currentStreak'] !== 1) {
			console.log(
				'\033[38;5;166m🔥 Current Streak: \033[m' +
					data[i]['currentStreak'] +
					' days'
			);
		}
	}
	return;
}

// Similar to logHabitData(), a console logging function for the edit menu.
function logEditHabitData (promptQty, results, initialVal) {
	let editPrompts = [
		'\033[0;92m' + questions[3] + '\n',
		'\033[38;5;184m✏️  Habit: \033[m' + results[0]['name'],
		'\033[38;5;25m✅ Checked In Today?: \033[m' +
			results[0]['checkedInToday'],
		'\033[38;5;197m📅 Start Date: \033[m' +
			`${results[0]['startDate']} (${results[0][
				'daysSinceStart'
			]} days ago)`,
		'\033[38;5;166m🔥 Current Streak: \033[m' +
			results[0]['currentStreak'] +
			'\n'
	];

	if (promptQty === 0) {
		return;
	}

	console.log(editPrompts[initialVal]);
	logEditHabitData(promptQty - 1, results, initialVal + 1);
}

// Logs the current option selected in main to the top line of the screen when in a new menu.
function displayAnswer (a) {
	process.stdout.write('\u001b[38;5;28;1;4m' + questions[a - 1] + '\033[m');
}

// Update-specific functions

// Takes in data from the database, and returns a new array to be used in read-functions.
function addToArray (data, arr, iArr, isCheckIn) {
	for (let i = 0; i < data.length; i++) {
		if (isCheckIn && data[i]['checkedInToday'] === false) {
			arr.push(`${data[i]['name']} ☐`);
		}
		else if (isCheckIn && data[i]['checkedInToday'] === true) {
			arr.push(`${data[i]['name']} ☑`);
		}
		else {
			arr.push(data[i]['name']);
		}
		iArr.push(i + 1);
	}
	if (isCheckIn) {
		return arr.push('Toggle All');
	}
	return arr;
}

// Takes user to the main 'edit' page for a SPECIFIC habit.
async function openHabitEditor (habit) {
	clearConsoleAndScrollBuffer();
	console.log('\u001b[38;5;28;1;4m%s\033[m\n', questions[3]);
	let nameResults = await Habit.find({ name: `${habit}` });

	logHabitData(nameResults);

	let editField = rl.keyInSelect(
		[
			'Edit Habit',
			'Edit Start Date',
			'Edit Current Streak',
			'Delete Habit'
		],
		''
	);

	switch (editField) {
		case -1:
			return returnToEdit();
		case 0:
			habitNameChanger(nameResults);
			break;
		case 1:
			habitDateChanger(nameResults);
			break;
		case 2:
			habitStreakChanger(nameResults);
			break;
		case 3:
			habitDestroyer(nameResults);
			break;
	}
}

// Allows user to update the name of the habit through database querying.
async function habitNameChanger (data) {
	clearConsoleAndScrollBuffer();
	logEditHabitData(1, data, 0);

	let escapedQuery =
		'\033[38;5;184m✏️  Habit\033[m ' +
		'(previously was: \u001b[1m' +
		data[0]['name'] +
		'\033[m): ';
	let editedHabit = rl.question(escapedQuery);

	return await Habit.findOneAndUpdate(
		{ name: data[0]['name'] },
		{ name: editedHabit }
	).then(() => {
		success('Habit successfully updated!');
	});
}

// Allows user to update the start date of the habit through database querying.
async function habitDateChanger (data) {
	clearConsoleAndScrollBuffer();
	logEditHabitData(3, data, 0);

	let editedHabit = rl.question(
		'\033[38;5;197m📅 Start Date (MM/DD/YYYY): \033[m'
	);

	if (validateDate(editedHabit)) {
		let newStartDate = customDate(editedHabit);
		await Habit.findOneAndUpdate(
			{ name: data[0]['name'] },
			{
				$set: {
					startDate: newStartDate,
					daysSinceStart: calculateDaysSinceStart(
						new Date(editedHabit)
					)
				}
			}
		).then(() => {
			success('Habit successfully updated!');
		});
	}
	else {
		console.log('\033[91mInvalid format. Try again.\033[m');
		setTimeout(() => {
			return habitDateChanger(data);
		}, 1000);
	}
}

// Allows user to update the current streak of the habit through database querying.
async function habitStreakChanger (data) {
	clearConsoleAndScrollBuffer();
	logEditHabitData(4, data, 0);

	let editedHabit = parseInt(
		rl.question('\033[38;5;166m🔥 Current Streak: \033[m')
	);
	let validateChecker = validateStreak(editedHabit, data[0]['startDate']);

	if (validateChecker) {
		await Habit.findOneAndUpdate(
			{ name: data[0]['name'] },
			{
				$set: {
					currentStreak: editedHabit
				}
			}
		).then(() => {
			success('Habit successfully updated!');
		});
	}
	else {
		console.log(
			'\033[91mStreak must be shorter than ' +
				`${data[0]['daysSinceStart']}.` +
				' Try again.\033[m'
		);
		setTimeout(() => {
			return habitStreakChanger(data);
		}, 2000);
	}
}

// Allows user to permanently delete the current habit.
async function habitDestroyer (data) {
	clearConsoleAndScrollBuffer();
	logEditHabitData(5, data, 0);

	let yesNo = rl.keyIn(
		'\033[91mAre you sure you want to delete this habit?\033[m (y/n)\n',
		{ limit: ['y', 'Y', 'n', 'N'], hideEchoBack: true, mask: '' }
	);

	if (yesNo === 'y' || yesNo === 'Y') {
		await Habit.deleteOne({ name: data[0]['name'] }).then(() => {
			success('Habit successfully deleted!');
		});
	}
	else {
		returnToEdit();
	}
}

// Convenient function that returns user back to the main edit menu.
function returnToEdit () {
	clearConsoleAndScrollBuffer();
	return updateHabits(3);
}

// Checks the data supplied by the user when updating in habitDateChanger() to determine its validity.
function validateDate (testDate) {
	const dateRegex = /^(0[1-9]|1[0-2])\/(0[1-9]|1\d|2\d|3[01])\/(19|20)\d{2}$/;
	return dateRegex.test(testDate);
}

// Checks the data supplied by the user when updating in habitStreakChanger() to determine its validity.
function validateStreak (testStreak, originDate) {
	const streakRegex = /^[0-9]\d*$/;
	let isSyntaticStreak = streakRegex.test(testStreak);

	let maxDays = calculateDaysSinceStart(canonizeDate(originDate));

	if (isSyntaticStreak && testStreak <= maxDays + 1) {
		return true;
	}
	return false;
}

// Converts a habit's date into a more readable format.
function customDate (enteredDate) {
	let customDate = new Date(enteredDate);
	let year = customDate.getFullYear();
	let month = months[customDate.getMonth()];
	let day = customDate.getDate();
	return `${month} ${day}, ${year}`;
}

// Returns a customized date into standardized format.
function canonizeDate (customDate) {
	let reverseParseRegex = /^([a-zA-Z]+)\s([1-9]|1[0-9]|2[0-9]|3[0-1]),\s(19\d{2}|20\d{2})$/;
	let arr = reverseParseRegex.exec(customDate);

	let canonizedDate = new Date(
		parseInt(arr[3]),
		parseInt(Object.keys(months)[Object.values(months).indexOf(arr[1])]),
		parseInt(arr[2])
	);
	return canonizedDate;
}

// Determines the difference in days between the current date and the start date of a habit.
function calculateDaysSinceStart (startDate) {
	const now = Date.now(); // current date
	const difference = now - startDate;
	const msPerDay = 24 * 60 * 60 * 1000;
	return Math.floor(difference / msPerDay);
}

// Accessory Functions

// Returns user to the main menu.
function spacebarMainMenu () {
	let mainMenu = rl.keyIn('', { limit: ' ' });
	if (mainMenu) return greet();
}

// Logs a success message to the console to confirm for the user a task was successfully completed.
function success (type) {
	console.log(
		'\033[1;31m%s\033[m Press \u001b[1;4mspacebar\033[m to exit.',
		type
	);
	return spacebarMainMenu();
}

// Exits the application and logs a goodbye message to the user.
function goodbye () {
	console.clear();
	console.log(qPrompt);
	process.stdout.write('Goodbye!');
	setTimeout(() => {
		return process.exit();
	}, 1000);
}

// Renders a blank console for the user and erases all scrollback data.
function clearConsoleAndScrollBuffer () {
	process.stdout.write('\u001b[3J\u001b[1J');
	console.clear();
}

// Resets check-in for each habit, and updates the amount of days since starting the habit.
async function dailyIncrement () {
	const now = new Date();

	let nowDay = now.getDate();
	let nowMonth = now.getMonth();
	let nowYear = now.getFullYear();

	let results = await Habit.find();
	for (habit of results) {
		let canonizedDate = canonizeDate(habit['startDate']);
		let configuredDate = calculateDaysSinceStart(canonizedDate);

		let updatedAtDay = habit['updatedAt'].getDate();
		let updatedAtMonth = habit['updatedAt'].getMonth();
		let updatedAtYear = habit['updatedAt'].getFullYear();

		if (
			nowDay > updatedAtDay ||
			nowMonth > updatedAtMonth ||
			nowYear > updatedAtYear
		) {
			await Habit.updateOne(
				{ name: habit['name'] },
				{
					$set: {
						daysSinceStart: configuredDate,
						checkedInToday: false
					}
				}
			);
		}
	}
}

// Queries the database to determine if all habits are currently toggled on/off.
async function grabToggleData () {
	let data = await Toggle.find({});
	let isToggled = data[0]['toggled'];
	return isToggled;
}

// Start the application.
greet();
