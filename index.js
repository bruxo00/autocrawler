'use strict'

const StandVirtual = require('./crawlers/StandVirtual');

let debugMode = false;

/**
 * Autocrawler entry point
 * @constructor
 * @param {string} platform - The platform to crawl.
 * @param {string} car - The car attributes.
 * @param {Object} filters - The search filters.
 */
const autocrawler = (platform, car, filters = {}) => {
	return new Promise((resolve, reject) => {
		if (platform.toLowerCase() === 'stand virtual') {
			StandVirtual.run(car, filters, debugMode)
				.then((list) => {
					resolve(list);
				})
				.catch((error) => {
					reject(error);
				});
		} else {
			reject(`Unkown platform \'${platform}\'`);
		}
	});
}

/**
 * Will toggle debug mode, which means it will disable Chrome headless mode.
 * @constructor
 * @param {Boolean} status - true | false
 */
const toggleDebug = (status) => {
	debugMode = status;
}

module.exports = autocrawler;
module.exports.toggleDebug = toggleDebug;
