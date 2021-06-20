const puppeteer = require('puppeteer-extra');
const stealth = require('puppeteer-extra-plugin-stealth');
const puppeteerJQuery = require('puppeteer-jquery');

module.exports = {
	run: (car, filters = {}, debugMode = false) => {
		return new Promise(async (resolve, reject) => {
			const originalCar = { ...car };
			const list = [];
			let page;
			let browser;

			// convets brand and model to normalized form
			// ex: Citroën C4 Picasso -> citroen c4-picasso
			car.brand = car.brand.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(' ', '-').trim();
			car.model = car.model.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(' ', '-').trim();

			try {
				puppeteer.use(stealth());

				browser = await puppeteer.launch({
					defaultViewport: {
						width: 1920,
						height: 1080,
						deviceScaleFactor: 1,
					},
					headless: !debugMode,
					args: ['--start-maximized']
				});

				page = await browser.newPage();

				const modelString = car.model ? `/${car.model}` : '';
				let filtersString = '';

				if (filters) {
					filtersString += '?';

					if (filters.price) {
						if (filters.price.from && filters.price.to && filters.price.from >= filters.price.to) {
							reject('Invalid price filters: \'to\' needs to be higher than \'from\'');
							return;
						}

						if (filters.price.from) {
							filtersString += `search[filter_float_price:from]=${filters.price.from}`;
						}

						if (filters.price.to) {
							filtersString += `search[filter_float_price:to]=${filters.price.to}`;
						}
					}

					if (filters.year) {
						if (filters.year.from && filters.year.to && filters.year.from >= filters.year.to) {
							reject('Invalid year filters: \'to\' needs to be higher than \'from\'');
							return;
						}

						if (filters.year.from) {
							filtersString = `/desde-${filters.year.from}` + filtersString; // I want to congratulate Stand Virtual Devs :D
						}

						if (filters.year.to) {
							filtersString += `search[filter_float_first_registration_year:to]=${filters.year.to}`;
						}
					}

					if (filters.km) {
						if (filters.km.from && filters.km.to && filters.km.from >= filters.km.to) {
							reject('Invalid year filters: \'to\' needs to be higher than \'from\'');
							return;
						}

						if (filters.km.from) {
							filtersString += `search[filter_float_mileage:from]=${filters.km.from}`;
						}

						if (filters.km.from) {
							filtersString += `search[filter_float_mileage:to]=${filters.km.to}`;
						}
					}

					if (filters.fuel) {
						const allowedFuels = ['diesel', 'electric', 'gaz', 'gpl', 'hibride-diesel', 'hibride-gaz'];

						if (!allowedFuels.includes(filters.fuel)) {
							reject(`Unknown fuel filter \'${filters.fuel}\'`);
							return;
						}

						filtersString += `search[filter_enum_fuel_type]=${filters.fuel}`;
					}
				}

				// adds the & to all but the first search
				filtersString = filtersString.replace(/search/g, '&search');
				filtersString = filtersString.replace('&search', 'search');

				await page.goto(`https://standvirtual.com/carros/${car.brand}${modelString}${filtersString}`, { waitUntil: 'networkidle2' });

				// injects jquery
				page = puppeteerJQuery.pageExtend(page);

				// removes cookie consent
				await page.jQuery('#onetrust-consent-sdk').remove();

				const hasResults = await page.jQuery('h1:contains("Sem resultados para a sua pesquisa")');

				// checks if there are any results
				if (hasResults.length !== 0) {
					resolve({
						car: originalCar,
						list: []
					});
					return;
				}

				let pagesProcessed = 0;

				while (true) {
					// waits for ads to load
					await page.waitForjQuery('[data-testid="search-results"] > article > :nth-child(1):visible');
					await page.waitForjQuery('[data-testid="search-results"] > article');

					// gets all ads
					let articles = await page.jQuery('[data-testid="search-results"] > article');

					// checks if there are more pages (go to next page opacity is not 0)
					let hasMorePages = ((await page.jQuery('[data-testid="pagination-step-forwards"]').css('opacity')) == 1 ? true : false);

					// get ads information on current page
					for (let i = 0; i < articles.length; i++) {
						// needs to be inside the loop because we might need to change the selectors individually
						const selectors = [{
							property: 'name',
							selector: 'div:nth-child(1) > [data-testid="ad-title"]'
						}, {
							property: 'price',
							selector: 'div:nth-child(3) > span'
						}, {
							property: 'km',
							selector: 'div:nth-child(1) > div > :nth-child(2) > :nth-child(4)'
						}, {
							property: 'fuel',
							selector: 'div:nth-child(1) > div > :nth-child(2) > :nth-child(1)'
						}, {
							property: 'year',
							selector: 'div:nth-child(1) > div > :nth-child(2) > :nth-child(3)'
						}, {
							property: 'photo',
							selector: 'div:nth-child(2) > span'
						}];
						let skipArticle = false;
						const url = await articles[i].$eval('div:nth-child(1) > [data-testid="ad-title"] > a', el => el.getAttribute('href'));
						let uid = url.split('-');
						uid = uid[uid.length - 1].replace('.html', '').trim();

						// checks if the article has the right structure
						// this can happen if there are premium ads in the page
						for (let s = 0; s < selectors.length; s++) {
							let result = await articles[i].$(selectors[s].selector);

							if (!result) {
								if (selectors[s].property === 'photo') { // is a premium ad (different structure)
									selectors[s].selector = 'div:nth-child(3) > div > div > div:nth-child(1) > div > div:nth-child(1) > a';

									result = await articles[i].$(selectors[s].selector);

									if (!result) {
										skipArticle = true;
									}
								} else {
									skipArticle = true;
								}

								if (skipArticle) {
									if (debugMode) {
										console.warn(`[AUTOCRAWLER] Skipping ${i} article on page ${pagesProcessed + 1}: can't find ${selectors[s].property} element`);
									}

									break;
								}
							}
						}

						// there is something wrong with the article, skip it
						if (skipArticle) {
							continue;
						}

						list.push({
							name: await articles[i].$eval(selectors.find(s => s.property === 'name').selector, el => el.textContent?.trim()),
							price: await articles[i].$eval(selectors.find(s => s.property === 'price').selector, el => el.textContent?.trim()),
							km: await articles[i].$eval(selectors.find(s => s.property === 'km').selector, el => el.textContent?.trim()),
							fuel: await articles[i].$eval(selectors.find(s => s.property === 'fuel').selector, el => el.textContent?.trim()),
							year: await articles[i].$eval(selectors.find(s => s.property === 'year').selector, el => el.textContent?.trim()),
							photo: await articles[i].$eval(selectors.find(s => s.property === 'photo').selector, el => el.getElementsByTagName('img')[0]?.src),
							url: url,
							uid: uid
						});
					}

					pagesProcessed++;

					// checks if there is more pages, if yes, then go to the next one
					if (hasMorePages) {
						// hide the articles to be able to wait for the new ones in the next page
						await page.jQuery('article').css('display', 'none');
						await page.jQuery('[data-testid="pagination-step-forwards"]').click();
					} else {
						break;
					}
				}

				await browser.close();

				// cleans the output
				resolve({
					car: originalCar,
					list: list.map(car => {
						return {
							...car,
							price: parseInt(car.price.replace('EUR', '').replace(/\s/g, '').trim()),
							km: parseInt(car.km.replace('KM', '').replace(/\s/g, '').trim()),
							year: parseInt(car.year)
						}
					})
				});
			} catch (error) {
				reject(error);
			}
		});
	}
}
