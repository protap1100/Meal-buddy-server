const express = require("express");
const app = express();
const { MongoClient, ServerApiVersion } = require("mongodb");
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


  app.get('/users',async(req,res)=>{
    const result = await userCollection.find().toArray();
    res.send(result)
  })

  app.get('/meals',async(req,res)=>{
    const result = await mealsCollection.find().toArray();
    res.send(result)
  })

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