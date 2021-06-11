const puppeteer = require('puppeteer-extra');
const stealth = require('puppeteer-extra-plugin-stealth');
const puppeteerJQuery = require('puppeteer-jquery');

module.exports = {
	run: (car = { brand: 'Renault', model: 'Clio' }) => {
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
						deviceScaleFactor: 1
					}
				});

				page = await browser.newPage();

				const modelString = car.model ? `/${car.model}` : '';
				await page.goto(`https://standvirtual.com/carros/${car.brand}${modelString}`, { waitUntil: 'networkidle2' });

				// injects jquery
				page = puppeteerJQuery.pageExtend(page);

				// removes cookie consent
				await page.jQuery('#onetrust-consent-sdk').remove();

				let pagesProcessed = 0;

				while (true) {
					// waits for ads to load
					await page.waitForjQuery('[data-testid="search-results"] > article');

					// gets all ads
					let articles = await page.jQuery('[data-testid="search-results"] > article');

					// checks if there are more pages (go to next page opacity is not 0)
					let hasMorePages = ((await page.jQuery('[data-testid="pagination-step-forwards"]').css('opacity')) == 1 ? true : false);

					// get ads information on current page
					for (let i = 0; i < articles.length; i++) {
						const url = await articles[i].$eval('div:nth-child(1) > [data-testid="ad-title"] > a', el => el.getAttribute('href'));
						let uid = url.split('-');
						uid = uid[uid.length - 1].replace('.html', '').trim();

						list.push({
							name: await articles[i].$eval('div:nth-child(1) > [data-testid="ad-title"]', el => el.textContent?.trim()),
							price: await articles[i].$eval('div:nth-child(3) > span', el => el.textContent?.trim()),
							km: await articles[i].$eval('div:nth-child(1) > div > :nth-child(2) > :nth-child(4)', el => el.textContent?.trim()),
							fuel: await articles[i].$eval('div:nth-child(1) > div > :nth-child(2) > :nth-child(1)', el => el.textContent?.trim()),
							year: await articles[i].$eval('div:nth-child(1) > div > :nth-child(2) > :nth-child(3)', el => el.textContent?.trim()),
							url: url,
							uid: uid
						});
					}

					pagesProcessed++;

					// checks if there is more pages, if yes, then go to the next one
					if (hasMorePages) {
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
