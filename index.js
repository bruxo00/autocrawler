'use strict'

const StandVirtual = require('./crawlers/StandVirtual');

/**
 * Autocrawler entry point
 * @constructor
 * @param {string} platform - The platform to crawl.
 * @param {string} car - The car attributes.
 */
const autocrawler = (platform, car) => {
	return new Promise((resolve, reject) => {
		if (platform.toLowerCase() === 'stand virtual') {
			StandVirtual.run(car)
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

module.exports = autocrawler;
