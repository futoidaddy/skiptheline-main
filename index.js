//when calling the API its getting a 404 error even though React and Express are set up correctly
//shows are working
//react sending req over but req not found

//TODO
//whether req params do multiple inputs or just one
//react conditional page access // server or react can handle on its own
//get Matt to create: confirmation code page, reset password / change password, order management, menu, admin page, 
//document code so later people can read this code
//random question but I was doing C++ earlier and for classes its advised to do an add then a get rather than directly changing the variable inside the class. Why?
//random idea for security but we should log all the actions of admin and sudo accounts (ehem mihoyo)

const express = require('express');
const app = express();
const cors = require('cors');
const pool = require('./db');
const session = require('express-session');
const nodemailer = require("nodemailer");
const sgTransport = require('nodemailer-sendgrid-transport');
const { isNullOrUndefined } = require('util');
const fs = require('fs');
const { callbackPromise } = require('nodemailer/lib/shared'); 

var LOCAL_DEV_FLAG = true;

//stripe credentials -- REMOVE LOCAL IN PROD
var stripe;
if (LOCAL_DEV_FLAG){
    stripe = require("stripe")('sk_test_51G8FYDCBPdoEPo2u1Oyqie0LaQVXVSVhTvP0DckvF8P3WpKz2HVSzJeJrTD3dEwA9BHFT1OQRIEutDBn8qqhegio00H5t5Um5o');
} 
else{
    stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
}
//sendgrid credentials -- REMOVE LOCAL IN PROD
if (LOCAL_DEV_FLAG){
  var options = {
    auth: {
      api_user: 'kevinlu1248@gmail.com',
      api_key: 'mrhob1ggay'
    } 
  }
}
else{
  var options = {
    auth: {
      api_user: process.env.SENDGRIDUSER,
      api_key: process.env.SENDGRIDPASS
    }
  }
}

app.use(cors());
app.use(express.json());
app.use(session({
    resave: true,
    saveUninitialized: false,
    secret:"skiptheline",
    cookie: {maxAge: 600000}
    //user_id: ""
}));
var transporter = nodemailer.createTransport(sgTransport(options));

//cart class
class Cart{
    //item_amount = 0;
    //total_price = 0;
    //items = [];
    
    constructor(){
      this.item_amount = 0;
      this.total_price = 0;
      this.items = [];          //item = {name, price, amount}
      this.pricelist = {};
    }
  
    getDBfoodprices(callback){
      var getpricequery = `SELECT item, price FROM foodmenu;`;
      pool.query(getpricequery, (error,result) => {
        if (error) {
          return callback(error);
        }
        else {
          var results = {'rows': result.rows };
          //console.log(results);
          callback(null, results);
        }
      });
    }
    getDBdrinkprices(callback){
      var getpricequery = `SELECT item, price FROM drinkmenu;`;
      pool.query(getpricequery, (error,result) => {
        if (error) {
          return callback(error);
        }
        else {
          var results = {'rows': result.rows };
          //console.log(results);
          callback(null, results);
        }
      });
    }
  
    insertPrice(item, price){
      this.pricelist[item] = price;
      if (this.pricelist[item] == price) {
        return 0;
      }
      else if (this.pricelist[item] != price) {
        this.pricelist[item] = price;
        return 0;
      }
      else {
        return -1;
      }
    }
    
    showPrice(){
      return this.pricelist;
    }
  
    updateAmountAndPrice(){
        var total = 0;
        var cart_items = this.items
        for (var i = 0; i < this.items.length; i++){
            total += (cart_items[i].price * cart_items[i].amount);
        }
        this.total_price = total;
        this.item_amount = this.items.length;
        return;
    }
  
    getItems(){
        return this.items;
    }
  
    loadItems(items){
        this.items = items;
        return;
    }
  
    hasItem(name){
        if (this.items === undefined){
            return -1;
        }
  
        for (var i = 0; i < this.items.length; i++){
            if (name == this.items[i].name){
                return i;
            }
        }
        return -1;
    }
  
    updateItem(item){
        var i = this.hasItem(item.name);
        this.items[i].amount += item.amount;
        return;
    }
  
    addItem(item){
        if (isNaN(item.amount) || item.amount == 0) {
          return;
        }
  
        if (this.hasItem(item.name) === -1){
            this.items.push({
                name: item.name,
                price: item.price,
                amount: item.amount,
                date: item.date
            });
            this.item_amount += 1;
        }
        else {
            this.updateItem(item);
        }
        this.updateAmountAndPrice();
        return;
    }
  
    removeItem(item_name){
      var i = this.hasItem(item_name);
      if (i != -1){
        this.items.splice(i,1);
      }
      return;
    }
  
    clearItems(){
        this.items = [];
        this.total = 0;
        this.item_amount = 0;
        return;
    }
};
  
var cart = new Cart();



//====== ROUTES ======//
app.get('/', async (req, res) => {
    res.json({online: true})
});


//---users---//
//create user
app.get('/createUser', async (req, res) => {
    var user_id, usr, pwd; //grab usr, pwd from inputs fields somehow; user_id is makeconfcode() but idk where to put that function
    try {
        const createUserQuery = await pool.query(`INSERT INTO users(user_id, username, password, authority) VALUES('${user_id}', '${usr}', crypt('${pwd}', gen_salt('bf')), '0');`);
        res.json();//what do you res.json for these since you're not showing anything
    } catch (err) {
        console.error(err.message);
    }
});

//edit password
app.get('/editPassword', async (req, res) => {
    //proposed workflow:
    //there should be 2 versions: one where you forgot your pwd and the other where you just want to change it
    // forgot case:
        //email confirmation
    // edit case:
        //enter current pwd and new pwd
    var new_pwd; //grab from input
    try {
        const editPwdQuery = await pool.query(`UPDATE users SET password = '${new_pwd}' WHERE username = '${req.session.username}'`); //idk if I defined req.session.username anywhere yet
        res.json({response: true});
    } catch (err) {
        console.error(err.message);
    }
});
//select user (login) --> I forgot what exactly you wanna do here
app.get('/selectUser', async (req, res) => {
    try {
        var user = req.body.user;
        var password = req.body.password;
        const selectUserResult = await pool.query(`SELECT * FROM users WHERE users.username = '${user}' AND users.password = crypt('${password}', password);`);
        res.json(selectUserResult.rows);
        console.log(user, password);
    } catch (err) {
        console.error(err.message);
    }
});

//---cart---//
//show cart
  //pricelist stuff
app.get('/showCart', async (req, res) => {
    if (req.session.pricelist == undefined) {
        req.session.pricelist = [];
    }
    cart.getDBfoodprices(function(err, result){
        for (var i = 0; i<result.rows.length; i++) {  
            var insertPriceCheck = cart.insertPrice(result.rows[i].item, result.rows[i].price);
        }
        console.log('insertPriceCheck in food = ', insertPriceCheck);
        var list = cart.showPrice();
        req.session.pricelist = list;
    }); 
    cart.getDBdrinkprices(function(err, result){
        for (var i = 0; i<result.rows.length; i++) {   
            var insertPriceCheck = cart.insertPrice(result.rows[i].item, result.rows[i].price);
        }
        console.log('insertPriceCheck in drink = ', insertPriceCheck);
        var list = cart.showPrice();
        req.session.pricelist = list;
    });
    console.log("req.session.pricelist = ", req.session.pricelist);
    console.log("line 47 session cart ",req.session.cart);
});

//add to cart
app.get('/addToCart', async (req, res) => {
    var item_name = req.body.item_name; //invalid call --REVISIT
    var item_quantity = (parseInt(req.body.item_quantity)); //invalid call
    // console.log(req.session.pricelist);
    var item_price = req.session.pricelist[`${item_name}`];
    var item_date = req.session.chosenDate;

    // console.log("item_price = ", item_price); 
    // console.log("item_name = ",item_name);
    // console.log("item_quantity = ",item_quantity);
    // console.log("item_date = ",item_date);

    var item_object = {'name': item_name, 'price': item_price, 'amount': item_quantity, 'date': item_date};
    // console.log('item object = ', item_object);
    cart.addItem(item_object);
    req.session.cart = cart.getItems();
    res.json(); //the hell do you do here
});

//remove from cart
app.get('/addToCart', async (req, res) => {
    var item_name = req.body.item_name;
    //console.log('item_name = ', item_name);
    cart.removeItem(item_name);
    req.session.cart = cart.getItems();
    res.json(); //the hell do you do here
});

//---orders---//
//create order
app.get('/createOrder', async (req, res) => {
    var user_id,order_id;
    var username = req.session.username;
    var cart_contents = req.session.cart
    // console.log("req session cart 298= ", cart_contents);
    
    var orderDatabaseQuery = "INSERT INTO order_details VALUES";
    var selectedDate = req.session.chosenDate.slice(0,10); //req.session.chosenDate not defined yet
    // console.log("rawOrderedDates= ", selectedDate);

    order_id = user_id.toString().concat(selectedDate.slice(2,4),selectedDate.slice(5,7),selectedDate.slice(8,10));
    order_id = parseInt(order_id); //user_id not defined to req.session yet. Speaking of which, if I added this to req.session would I still need to randomly generate a user token to verify security in checkAuth?

    // console.log("req session cart 307= ", cart_contents);
    cart_contents.forEach(cart_element => {
    orderDatabaseQuery+=`('${order_id}','${cart_element.name}','${cart_element.price}','${cart_element.amount}','${cart_element.date}'),`
    });
    orderDatabaseQuery = orderDatabaseQuery.slice(0,-1) + ';';
    // console.log('orderDatabaseQuery= ', orderDatabaseQuery);
    try {
        const createOrderQuery = await pool.query(orderDatabaseQuery); //idk if I defined req.session.username anywhere yet
        res.json();//what do you res.json for these since you're not showing anything
    } catch (err) {
        console.error(err.message);
    }
});

//edit order -- sorry why do we need this again? admin feature?

//delete order -- same here

//show orders (both pending and confirmed)
app.get('/showClientOrders', async (req, res) => {
    try {
        const showClientOrderResult = await pool.query(`SELECT user_id,order_id,date,item,price,quantity FROM order_details NATURAL JOIN orders NATURAL JOIN users WHERE users.username = '${req.session.username}' ORDER BY date;`);
        res.json(showClientOrderResult.rows);
    } catch (err) {
        console.error(err.message);
    }
});

//---menu---//
//create food menu item
app.get('/addFoodItem', async (req, res) => { //are these gets? should be posts right
    var foodItemAdd = req.body.foodMenuItemAdd; //change id name on page
    var foodItemPrice = req.body.foodMenuItemPrice;
    var foodItemStartDate = new Date(req.body.menuItemStartDate);
    var foodItemEndDate = new Date(req.body.menuItemEndDate);
    foodItemStartDate = foodItemStartDate.toISOString();
    foodItemEndDate = foodItemEndDate.toISOString();

    // console.log(foodItemStartDate);
    // console.log(foodItemEndDate);

    var foodItemAddQuery = `INSERT INTO foodmenu SELECT '${foodItemAdd}', '${foodItemPrice}', '${foodItemStartDate}', '${foodItemEndDate}' WHERE NOT EXISTS(SELECT 1 FROM foodmenu WHERE item='${foodItemAdd}' AND startdate='${foodItemStartDate}' AND enddate='${foodItemEndDate}');`;
    
    try {
        const foodResult = await pool.query(foodItemAddQuery);
        res.json(); //idk what to put out
    } catch (err) {
        console.error(err.message);
    }
});

//edit food menu item -- what are we editing again exactly?

//delete food menu item
app.get('/removeFoodItem', async (req, res) => {
    var foodItemRemove = req.body.food_item; //temporary
    var foodRemoveQuery = `DELETE FROM foodmenu WHERE item = '${foodItemRemove}';`;  //make that a const?
    try {
        const foodResult = await pool.query(foodRemoveQuery);
        res.json(foodResult.rows); //idk also might crash cuz foodResult is used in another route too
    } catch (err) {
        console.error(err.message);
    }
});

//show food menu items
app.get('/foodmenu', async (req, res) => {
    try {
        const foodResult = await pool.query('SELECT * FROM foodmenu;');
        res.json(foodResult.rows);
    } catch (err) {
        console.error(err.message);
    }
});

//create drink menu item
app.get('/addDrinkItem', async (req, res) => { //are these gets? should be posts right
    var drinkItemAdd = req.body.drinkMenuItemAdd; //note var names are different
    var drinkItemPrice = req.body.drinkMenuItemPrice;

    var drinkItemAddQuery = `INSERT INTO drinkmenu SELECT '${drinkItemAdd}', '${drinkItemPrice}', '${drinkItemStartDate}', '${drinkItemEndDate}' WHERE NOT EXISTS(SELECT 1 FROM drinkmenu WHERE item='${drinkItemAdd}' AND startdate='${drinkItemStartDate}' AND enddate='${drinkItemEndDate}');`;
    
    try {
        const drinkResult = await pool.query(drinkItemAddQuery);
        res.json(); //idk what to put out
    } catch (err) {
        console.error(err.message);
    }
});

//edit drink menu item

//delete drink menu item
app.get('/removeDrinkItem', async (req, res) => {
    var drinkItemRemove = req.body.drink_item; //temporary ?? from old code
    var drinkRemoveQuery = `DELETE FROM drinkmenu WHERE item = '${drinkItemRemove}';`;  //make that a const?
    try {
        const drinkResult = await pool.query(drinkRemoveQuery);
        res.json(drinkResult.rows); //idk also might crash cuz drinkResult is used in another route too
    } catch (err) {
        console.error(err.message);
    }
});

//show drink menu items
app.get('/drinkmenu', async (req, res) => {
    try {
        const drinkResult = await pool.query('SELECT * FROM drinkmenu;');
        res.json(drinkResult.rows);
    } catch (err) {
        console.error(err.message);
    }
});

//---admin---//
//show all users
app.get('/users', async (req, res) => {
    try {
        const userResult = await pool.query('SELECT * FROM users;'); //user_id, username, password, authority
        res.json(userResult.rows);
    } catch (err) {
        console.error(err.message);
    }
});

//show all orders
app.get('/showOrders', async (req, res) => {
    try {
        const showOrderResult = await pool.query(`SELECT user_id,order_id,date,item,price,quantity FROM order_details NATURAL JOIN orders NATURAL JOIN users ORDER BY date;`);
        res.json(showOrderResult.rows);
    } catch (err) {
        console.error(err.message);
    }
});

//show all orders_details (for caf workers)
app.get('/showOrderDetails', async (req, res) => {
    try {
        const orderDetailResult = await pool.query('SELECT * FROM order_details;');
        res.json(orderDetailResult.rows);
    } catch (err) {
        console.error(err.message);
    }
});



app.listen(5000, () => {
    console.log("Server started on port 5000.");
});

