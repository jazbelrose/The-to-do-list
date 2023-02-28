// Import the necessary packages:

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require("mongoose");

// Create an instance of the Express app:
const app = express();

// Set the view engine to ejs:
app.set('view engine', 'ejs');

// Use body-parser middleware to parse incoming request bodies:
app.use(bodyParser.urlencoded({ extended: true }));


//Serve static files from the public directory:
app.use(express.static("public"));



//Connect to MongoDB:


const url = "mongodb://127.0.0.1:27017/testdb";

mongoose.connect(url, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log("Connected to MongoDB");
    app.listen(3000, () => {
      console.log("Server is running on port 3000");
    });
  })
  .catch((error) => {
    console.error('Error connecting to MongoDB', error);
  });




//Define the Mongoose schema for an item:

const itemSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Item name is required"]
    }
});


// Create a Mongoose model for an item:

const Item = mongoose.model("Item", itemSchema);


// Define the default items:

const item1 = new Item({
    name: "Welcome to your todo list"
});

const item2 = new Item({
    name: "Hit the + button to add a new item"
});

const item3 = new Item({
    name: "<-- Hit this to delete an item"
});

const defaultItems = [item1, item2, item3];


// Define the schema for a list:


const listSchema = {
    name: String,
    items: [itemSchema]
};


// Define an async function to save the default items to the database:

async function saveDefaultItemsToDB() {
    try {
      const count = await Item.countDocuments();
      if (count === 0) {
        await Item.insertMany(defaultItems);
        console.log("Successfully saved default items to DB");
      }
    } catch (err) {
      console.error(err);
    }
  }

// Call the saveDefaultItemsToDB() function to save the default items to the database:
  
saveDefaultItemsToDB();


// Create a Mongoose model for a list:

const List = mongoose.model("List", listSchema);


// Handle GET requests to the root route:

app.get('/', async (req, res) => {
    try {
      const foundItems = await Item.find({});
      if (foundItems.length === 0) {
        await saveDefaultItemsToDB();
        res.redirect('/');
      } else {
        res.render('list', { listTitle: "Today", newListItems: foundItems });
      }
    } catch (err) {
      console.error(err);
      res.render('list', { listTitle: "Today", newListItems: [] });
    }
  });
 
  
  app.get('/:customListName', async (req, res) => {
    const customListName = req.params.customListName;
    try {
      const foundList = await List.findOne({ name: customListName });
      if (foundList) {
        if (foundList.items.length > 0) {
          res.render('list', { listTitle: foundList.name, newListItems: foundList.items });
        } else {
          await foundList.updateOne({ items: defaultItems });
          res.redirect(`/${customListName}`);
        }
      } else {
        const list = new List({
          name: customListName,
          items: defaultItems
        });
        await list.save();
        res.redirect(`/${customListName}`);
      }
    } catch (err) {
      console.error(err);
      res.redirect('/');
    }
  });
  


//   Handle POST requests to the root route:

app.post('/', async (req, res) => {
    const itemName = req.body.newItem;
    const listName = req.body.list;
    const item = new Item({ name: itemName });
  
    try {
      if (listName === "Today") {
        await item.save();
        res.redirect('/');
      } else {
        const foundList = await List.findOne({ name: listName });
        foundList.items.push(item);
        await foundList.save();
        res.redirect('/' + listName);
      }
    } catch (err) {
      console.error(err);
      res.redirect('/');
    }
  });
  
  app.post('/delete', async (req, res) => {
    const checkedItemId = req.body.checkbox;
    const listName = req.body.listName;
  
    try {
      await Item.findByIdAndRemove(checkedItemId);
      if (listName === "Today") {
        res.redirect('/');
      } else {
        const foundList = await List.findOne({ name: listName });
        if (foundList) {
          foundList.items.pull({ _id: checkedItemId });
          await foundList.save();
          res.redirect('/' + listName);
        } else {
          res.redirect('/');
        }
      }
    } catch (err) {
      console.error(err);
      res.redirect('/');
    }
  });
  