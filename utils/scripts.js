/**
 * @return {number} returns the total number of reviews.
 */
const getReviewsCount = () => {
    const count = document.querySelector("div.gm2-caption").textContent;
    return parseInt(count.match(/[0-9]*/g).join(""));
}

/**
 * @return {number} returns the current count of reviews.
 */
const getCurrentCount = () => {
    return document.querySelectorAll(".section-review-content").length;
}

/**
 * @return {number} returns the scrollHeight.
 */
const getPreviousHeight = () => {
    return document.querySelector(".section-scrollbox.scrollable-y.scrollable-show").scrollHeight;
}

/**
 * scroll the scrollbar to the bottom
 */
const scrollToBottom = () => {
    let scrollbar = document.querySelector(".section-scrollbox.scrollable-y.scrollable-show");
    scrollbar.scrollTo(0, scrollbar.scrollHeight);
}

/**
 * @return {Array.<{author: string, content: string, rating: number}>} returns all reviews.
 */
const getAllReviews = () => {
    const all_reviews = document.querySelectorAll(".section-review-content");
    const result = [...all_reviews].map((e) => {
        const author = e.querySelector(".section-review-title").textContent;
        const content = e.querySelector(".section-review-text").textContent;

        let rating = null;

        if (e.querySelector(".section-review-stars")) {
            rating = e.querySelector(".section-review-stars").getAttribute("aria-label");
        } else if (e.querySelector(".section-review-numerical-rating")) {
            rating = e.querySelector(".section-review-numerical-rating").textContent;
        }
        rating = rating.trim().match(/([0-9])[^0-9]/)[0];
        rating = parseInt(rating);
        return { author, content, rating };
    });
    return result;
}

const getLocationSummary = () => {
    const score = document.querySelector("div[class*='__location-summary-body']>div[class$='__formatted-score-container']").textContent;
    const location_summary = document.querySelector("div[class*='__location-summary-body'] div[class*='__location-summary-overview-text']").textContent;
    return {
        location_summary,
        location_summary_rating: parseFloat(score)
    }
}

const getRatingData = () => {
    const count = document.querySelector("div.gm2-caption").textContent;
    const each_rating = document.querySelectorAll("tr[class$='__histogram'] div[aria-label~='則評論']");
    const avg_rating = document.querySelector("div.gm2-display-2").textContent;
    return {
        r5: parseInt(each_rating[0].getAttribute('aria-label').match(/[0-9]*/g).join("")),
        r4: parseInt(each_rating[1].getAttribute('aria-label').match(/[0-9]*/g).join("")),
        r3: parseInt(each_rating[2].getAttribute('aria-label').match(/[0-9]*/g).join("")),
        r2: parseInt(each_rating[3].getAttribute('aria-label').match(/[0-9]*/g).join("")),
        r1: parseInt(each_rating[4].getAttribute('aria-label').match(/[0-9]*/g).join("")),
        r_avg: parseFloat(avg_rating),
        total_review: parseInt(count.match(/[0-9]*/g).join(""))
    };
}

const getTTDData = () => {
    const iterable = document.evaluate("//h2[text()='地點摘要']/../../div[contains(@class,'section-layout-inset-shadow')]/div[contains(@class,'__section')]", document, null, XPathResult.ANY_TYPE, null);
    const result = [];
    let section = iterable.iterateNext();
    while (section) {
        const description = section.querySelector("div[class$='__description']") ? section.querySelector("div[class$='__description']").textContent : '';
        result.push({
            name: section.querySelector("div[class*='__title']").textContent,
            rating: parseFloat(section.querySelector("span[class$='__rating']").textContent),
            total_review: parseInt(section.querySelector("span[class$='__reviews']").textContent.match(/[0-9]*/g).join("")),
            description
        });
        section = iterable.iterateNext();
    }
    return result;
}

module.exports = { getReviewsCount, getCurrentCount, getPreviousHeight, scrollToBottom, getAllReviews, getRatingData, getLocationSummary, getTTDData };