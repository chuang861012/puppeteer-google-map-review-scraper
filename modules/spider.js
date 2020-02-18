const fs = require("fs");
const path = require("path");

const puppeteer = require("puppeteer");
const mongoose = require('mongoose');
const ProgressBar = require('progress');
const createCsvWriter = require('csv-writer').createArrayCsvWriter;

const reviewSchema = require("../models/reviews");
const { getReviewsCount, getCurrentCount, getPreviousHeight, scrollToBottom, getAllReviews, getRatingData, getLocationSummary, getTTDData } = require("../utils/scripts");

const DIST_PATH = path.resolve(__dirname, '../dist');
const DIST_REVIEWS_PATH = path.resolve(DIST_PATH, 'reviews');
const BNB_FILE_PATH = path.resolve(DIST_PATH, 'bnb.csv');
const BNBTTD_FILE_PATH = path.resolve(DIST_PATH, 'bnb_things_to_do.csv');

const bnbCsvWriter = createCsvWriter({
    path: BNB_FILE_PATH,
    header: ['p_bnb_id', 'r5', 'r4', 'r3', 'r2', 'r1', 'r_avg', 'total_review', 'location_summary', 'location_summary_rating'],
    append: true
});

const bnbTTDCsvWriter = createCsvWriter({
    path: BNBTTD_FILE_PATH,
    header: ['p_bnb_id', 'name', 'rating', 'total_review', 'description'],
    append: true
});

/**
 * 
 * @param {Object} page page object of puppeteer
 * @param {number} total total review number of this place
 * @param {{max?: [number=200], delay?: [number=100], name?: [string="unknown"]}} option options
 */
const infiniteScrolling = async (page, total, option = {}) => {
    const max = option.max || 200;
    const delay = option.delay || 100;
    const name = option.name || "unknown";
    const bar = new ProgressBar(`crawling : "${name}" [:bar] :percent`, { total: max, width: 30 });
    let current_count = await page.evaluate(getCurrentCount);

    while (current_count < total && current_count < max) {
        await page.waitForSelector(".section-scrollbox.scrollable-y.scrollable-show");
        const previousHeight = await page.evaluate(getPreviousHeight);

        await page.evaluate(scrollToBottom);

        await page.waitForFunction(`document.querySelector(".section-scrollbox.scrollable-y.scrollable-show").scrollHeight>${previousHeight}`);
        await page.waitFor(delay);
        current_count = await page.evaluate(getCurrentCount);
        bar.tick(10);
    }
}

class Spider {
    constructor() {
        this.browser = null;
        this.page = null;
        this.result = null;
    }

    /**
     * initialize spider
     */
    async init() {
        this.browser = await puppeteer.launch();
        this.page = await this.browser.newPage();
    }

    /**
     * Crawling google map.
     * @param {object} place place object contains name & id.
     * @param {number} max limitation of reviews.
     */
    async crawl(place, max) {
        const url = `https://www.google.com/maps/search/?api=1&query=${place.name}&query_place_id=${place.id}`;
        await this.page.goto(url);

        // location_summary, location_summary_rating
        await this.page.waitForSelector("div[class*='__location-summary-body']>div[class$='__formatted-score-container']", { timeout: 10000, visible: true });
        const ls_data = await this.page.evaluate(getLocationSummary);
        // TODO: 活動
        const ttd_btn = await this.page.waitForSelector("button[aria-label='建議活動']", { timeout: 10000, visible: true });
        await ttd_btn.click();
        await this.page.waitForXPath("//h2[text()='地點摘要']/../../div[contains(@class,'section-layout-inset-shadow')]/div[contains(@class,'__section')]", { timeout: 10000, visible: true });
        const ttd_data = await this.page.evaluate(getTTDData);
        // TODO: 運輸

        const btn = await this.page.waitForXPath("//button[@class='allxGeDnJMl__button allxGeDnJMl__button-text'][contains(@aria-label,'評論')]", { timeout: 10000, visible: true });
        await btn.click();
        await this.page.waitForNavigation();
        await this.page.waitForSelector(".section-review-text", { timeout: 10000 });

        // bnb meta data
        const meta_data = await this.page.evaluate(getRatingData);
        await infiniteScrolling(this.page, meta_data.total_review, { max, name: place.name });

        const reviews = await this.page.evaluate(getAllReviews);

        const title = await this.page.title();

        this.result = { title, data: reviews, bnb: Object.assign(meta_data, ls_data), ttd: ttd_data };
    }

    /**
     * Save result to an file in ./dist
     * Clear this.result.
     */
    save() {
        if (!this.result) {
            throw new Error("There is no data to save.")
        }

        if (!fs.existsSync(DIST_PATH)) {
            fs.mkdirSync(DIST_PATH);
        }

        fs.writeFileSync(path.resolve(DIST_PATH, `${this.result.title}.json`), JSON.stringify(this.result));
        this.result = null;
    }

    /**
     * save result as csv file
     * @param {number} p_bnb_id id of bnb from source data
     * @param {string} bnb_name name of bnb from source data
     */
    async saveCsv(p_bnb_id, bnb_name) {
        if (!this.result) {
            throw new Error("There is no data to save.")
        }

        if (!fs.existsSync(DIST_PATH)) {
            fs.mkdirSync(DIST_PATH);
            fs.writeFileSync(BNB_FILE_PATH, '\uFEFFp_bnb_id,r5,r4,r3,r2,r1,r_avg,total_review,location_summary,location_summary_rating\n');
            fs.writeFileSync(BNBTTD_FILE_PATH, '\uFEFFp_bnb_id,name,rating,total_review,description\n');
        }

        if (!fs.existsSync(DIST_REVIEWS_PATH)) {
            fs.mkdirSync(DIST_REVIEWS_PATH);
        }

        const REVIEW_FILE_PATH = path.resolve(DIST_REVIEWS_PATH, `${this.result.title}.csv`);

        const { r5, r4, r3, r2, r1, r_avg, total_review, location_summary, location_summary_rating } = this.result.bnb;
        await bnbCsvWriter.writeRecords([[p_bnb_id, r5, r4, r3, r2, r1, r_avg, total_review, location_summary, location_summary_rating]]);

        // TODO: write ttd data
        const ttd_records = this.result.ttd.map(({ name, rating, total_review, description }) => [p_bnb_id, name, rating, total_review, description.replace(/\n/g, " ")]);
        await bnbTTDCsvWriter.writeRecords(ttd_records);


        const reviewCsvWriter = createCsvWriter({
            path: REVIEW_FILE_PATH,
            header: ['p_bnb_id', 'bnb_name', 'c_id', 'c_author', 'c_rating', 'c_content']
        });

        const records = this.result.data.map((c, index) => [p_bnb_id, bnb_name, index, c.author, c.rating, c.content.replace(/\n/g, " ")]);
        await reviewCsvWriter.writeRecords(records);

        // add BOM
        const temp = fs.readFileSync(REVIEW_FILE_PATH);
        fs.writeFileSync(REVIEW_FILE_PATH, `\uFEFF${temp}`);

        this.result = null;
    }

    /**
     * Save result to mongodb
     * @param {string} collection collection name to save.
     * @return {Promise}
     */
    saveToDb(collection) {
        if (!this.result) {
            throw new Error("There is no data to save.")
        }

        const Review = mongoose.model("Review", reviewSchema, collection);

        const doc = new Review(this.result);
        this.result = null;

        return doc.save()
            .then(() => {
                console.log("document saved.");
            }).catch(e => {
                console.log(e);
            });
    }

    /**
     * clear result
     */
    clear() {
        this.result = null;
    }

    /**
     * Close puppeteer 
     */
    async close() {
        await this.browser.close();
    }

    /**
     * close connection to mongodb
     */
    closeDb() {
        return mongoose.connection.close();
    }
}

module.exports = Spider;