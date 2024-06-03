const express = require("express");
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.l5d87as.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  const database = client.db("MealBuddy");
  const userCollection = database.collection("users");
  const mealsCollection = database.collection("mealsCollection");
  const contactCollection = database.collection("contactCollection");
  const upcomingMeals = database.collection("upcomingMeals");

  // Meals Related Api's
  app.post("/meals", async (req, res) => {
    const mealData = req.body;
    const result = await mealsCollection.insertOne(mealData);
    res.send(result);
  });

  app.get("/meals", async (req, res) => {
    const result = await mealsCollection.find().toArray();
    res.send(result);
  });

  app.delete('/meals/:id',async(req,res)=>{
    const id = req.params.id;
    const query = {_id: new ObjectId(id)}
    const result = await mealsCollection.deleteOne(query);
    res.send(result)
  })

  // Upcoming Meals Related Api's 
  app.post('/upcomingMeals',async(req,res)=>{
    const uMeal = req.body;
    const result = await upcomingMeals.insertOne(uMeal);
    res.send(result);
  })

  app.get('/upcomingMeals',async(req,res)=>{
    const result = await upcomingMeals.find().toArray();
    res.send(result);
  })

  app.delete('/upcomingMeals/:id',async(req,res)=>{
    const id = req.params.id;
    const query = {_id: new ObjectId(id)}
    const result = await upcomingMeals.deleteOne(query);
    res.send(result)
  })

  app.post("/transferMeal/:id", async (req, res) => {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const meal = await upcomingMeals.findOne(query);
    const result = await mealsCollection.insertOne(meal);
    const deleteResult = await upcomingMeals.deleteOne(query);
    if (!deleteResult.deletedCount) {
      await mealsCollection.deleteOne({ _id: result.insertedId });
    }
    res.send({ message: "Meal transferred successfully"});
  });

  // Users Related Api
  app.post("/users", async (req, res) => {
    const user = req.body;
    const query = { email: user.email };
    const existingUser = await userCollection.findOne(query);
    if (existingUser) {
      return res.send({ message: "User Already Exist" });
    }
    const result = await userCollection.insertOne(user);
    res.send(result);
  });

  // User Related Api's
  app.get("/users", async (req, res) => {
    const result = await userCollection.find().toArray();
    res.send(result);
  });

  app.get("/users/:email", async (req, res) => {
    const userEmail = req.params.email;
    let query = {};
    if (req.query?.email) {
      query = { email: userEmail };
    }
    console.log("user email", userEmail, "query", query);
    const cursor = await userCollection.findOne(query);
    // console.log(cursor)
    res.send(cursor);
  });

  app.delete("/users/:id", async (req, res) => {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const user = await userCollection.findOne(query);
    if (!user) {
      return res.status(404).send({ message: "User not found" });
    }
    if (user.role === "admin") {
      return res.status(403).send({ message: "Admin users cannot be deleted" });
    }
    const result = await userCollection.deleteOne(query);
    res.send(result);
  });

  app.patch("/users/admin/:id", async (req, res) => {
    const id = req.params.id;
    const filter = { _id: new ObjectId(id) };
    const updateDoc = {
      $set: {
        role: "admin",
      },
    };
    const result = await userCollection.updateOne(filter, updateDoc);
    res.send(result);
  });

  app.get("/meals/:id", async (req, res) => {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const result = await mealsCollection.findOne(query);
    res.send(result);
  });

  // Contact Us Adding
  app.post("/contact", async (req, res) => {
    const contactData = req.body;
    const result = await contactCollection.insertOne(contactData);
    res.send(result);
  });

  app.get("/contact", async (req, res) => {
    const result = await contactCollection.find().toArray();
    res.send(result);
  });
  app.delete("/contact/:id", async (req, res) => {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const result = await contactCollection.deleteOne(query);
    res.send(result);
  });

  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", async (req, res) => {
  res.send("Meal Buddy Is Running");
});

app.listen(port, async (req, res) => {
  console.log(`Meal Buddy Is Running${port}`);
});
