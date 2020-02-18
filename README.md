# Map reviews spider (puppeteer)

## Usage
1. run `npm install`
2. Add a .env file.
3. `npm start`

### Environment variable
Set the following variables in .env file.    
**API_KEY** : Google Place API key.    
**CONNECTION_STRING** :   MongoDB connection string with username & password

## Dependencies
- axios
- dotenv
- puppeteer ( this will install chromium locally )
- progress
- mongoose

## Entry point
### app.js
##### main(lat, lng, collection, option)   
- `lat` `lng` : \<number> : the latitude & longitude of the place to search.   
- `collection` \<string> : the collection name to save in mongodb.  
- `option` \<object> : 
    * `max` \<number> : the max length of reviews to get at each place. default to **200** 
    * `radius` \<number> : radius in meters. default to **1500**   
    * `type` \<string> : the place type of place api. default to **restaurant** (full list : [Place Types](https://developers.google.com/places/supported_types))