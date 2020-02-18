require("dotenv").config();

const neatCsv = require('neat-csv');
const fs = require('fs')

const Map = require("./modules/map");
const Spider = require("./modules/spider");

const file = fs.readFileSync('assets/bnb_location.csv', 'utf8');

const map = new Map(process.env.API_KEY);
const spider = new Spider();

/**
 * Loop through the queue and crawl each place in the queue.
 * Save the results in mongodb.
 * @param {Array.<{name: string, id: string}>} queue the queue to be crawled in spider.
 * @param {string} collection collection name to save.
 * @param {number} max limitation of reviews.
 */
const scrape = async (queue, collection, max) => {
    for (const place of queue) {
        try {
            await spider.crawl(place, max);
        } catch (e) {
            console.log(e);
        }

        try {
            spider.save();
        } catch (e) {
            console.log(e);
        }
    }
}

/**
 * The entry point of this program.
 * @param {number} lat lat
 * @param {number} lng lng
 * @param {string} collection collection name to save.
 * @param {{max?: [number=200],type?: [string="restaurant"],radius?: [number=1500]}} option options.
 */
const nearby = async (lat, lng, collection, option = {}) => {
    const max = option.max || 200;
    const type = option.type || "restaurant";
    const radius = option.radius || 1500;

    await spider.init();
    let queue = await map.nearby(lat, lng, radius, type);
    await scrape(queue, collection, max);
    while (map.hasNext()) {
        queue = map.next();
        await scrape(queue, collection, max);
    }
};

const main = async () => {
    const queue = await neatCsv(file);
    await spider.init();
    for (const place of queue) {
        if (place.bnb_name === 'NULL') continue;
        const placeId = await map.getSinglePlace(place.p_latitude, place.p_longitude, place.bnb_name);
        try {
            await spider.crawl({ name: place.bnb_name, id: placeId }, 1000);
        } catch (e) {
            console.log(e.message);
        }
        try{
            await spider.saveCsv(Object.values(place)[0], place.bnb_name);
        }catch(e){
            console.log(e.message);
        }
    }
};

main();