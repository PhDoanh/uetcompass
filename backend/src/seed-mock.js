require('dotenv').config();

const { runManualCli } = require('./modules/curriculum/seed.job');

runManualCli().catch((error) => {
	console.error(error);
	process.exit(2);
});
