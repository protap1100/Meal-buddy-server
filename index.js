require("dotenv").config();
const express = require("express");
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
var jwt = require("jsonwebtoken");
const port = process.env.PORT || 5000;

// MiddleWare
app.use(cors());
app.use(express.json());

// Custom Middleware
const verifyToken = (req, res, next) => {
  // console.log("auth token", req.headers.authorization);
  if (!req.headers.authorization) {
    return res.status(401).send({ message: "Unauthorized Access" });
  }
  const token = req.headers.authorization.split(" ")[1];
  // console.log(token)
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
    if (error) {
      return res.status(401).send({ message: "Forbidden Access" });
    }
    req.decoded = decoded;
    next();
  });
};

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
  const servingMeals = database.collection("servingMeals");
  const reviewCollection = database.collection("reviewCollection");

  const verifyAdmin = async (req, res, next) => {
    const email = req.decoded.email;
    const query = { email: email };
    const user = await userCollection.findOne(query);
    const isAdmin = user.role === "admin";
    if (!isAdmin) {
      return res.status(403).send({ message: "Forbidden Access" });
    }
    next();
  };

  // jwt related api's
  app.post("/jwt", async (req, res) => {
    const user = req.body;
    const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
      expiresIn: "1d",
    });
    res.send({ token });
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
  app.get("/users",verifyToken, verifyAdmin,  async (req, res) => {
    // console.log(req.headers);
    const result = await userCollection.find().toArray();
    res.send(result);
  });

  app.get("/users/:email", async (req, res) => {
    const userEmail = req.params.email;
    let query = {};
    if (req.params?.email) {
      query = { email: userEmail };
    }
    const cursor = await userCollection.findOne(query);
    // console.log(cursor)
    res.send(cursor);
  });

  app.get("/user/admin/:email", async (req, res) => {
    const email = req.params.email;
    if (email !== req.params.email) {
      return res.status(403).send({ message: "unauthorized access" });
    }
    const query = { email: email };
    const user = await userCollection.findOne(query);
    let admin = false;
    if (user) {
      admin = user?.role === "admin";
    }
    res.send({ admin });
  });

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

  app.delete("/meals/:id", async (req, res) => {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const result = await mealsCollection.deleteOne(query);
    res.send(result);
  });

  // Upcoming Meals Related Api's
  app.post("/upcomingMeals", async (req, res) => {
    const uMeal = req.body;
    const result = await upcomingMeals.insertOne(uMeal);
    res.send(result);
  });

  app.get("/upcomingMeals",verifyToken, verifyAdmin,  async (req, res) => {
    const result = await upcomingMeals.find().toArray();
    res.send(result);
  });

  app.delete("/upcomingMeals/:id", async (req, res) => {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const result = await upcomingMeals.deleteOne(query);
    res.send(result);
  });

  app.post("/transferMeal/:id", async (req, res) => {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const meal = await upcomingMeals.findOne(query);
    const result = await mealsCollection.insertOne(meal);
    const deleteResult = await upcomingMeals.deleteOne(query);
    if (!deleteResult.deletedCount) {
      await mealsCollection.deleteOne({ _id: result.insertedId });
    }
    res.send({ message: "Meal transferred successfully" });
  });

  // Reserved Meals Api's
  app.post("/servedMeals", async (req, res) => {
    const Meals = req.body;
    const result = await servingMeals.insertOne(Meals);
    res.send(result);
  });

  app.get("/servingMeals",verifyToken, verifyAdmin, async (req, res) => {
    const meals = await servingMeals.find().toArray();
    res.send(meals);
  });

  app.get("/sServingMeals/:email", async (req, res) => {
    const email = req.params.email;
    const filter = { email: email };
    const result = await servingMeals.find(filter).toArray();
    res.send(result);
  });

  // Like Related Api's
  app.patch("/likes/:id", async (req, res) => {
    const id = req.params.id;
    const filter = { _id: new ObjectId(id) };
    const findDoc = await mealsCollection.findOne(filter);
    const updateLike = findDoc.likes + 1;
    const query = { $set: { likes: updateLike } };
    const updateData = await mealsCollection.updateOne(filter, query);
    res.send(updateData);
  });

  // Review's Related Post
  app.post("/review", async (req, res) => {
    const review = req.body;
    const mealId = review.MealId;
    const filter = { _id: new ObjectId(mealId) };
    const findDoc = await mealsCollection.findOne(filter);
    const updatedReviewsCount = findDoc.reviews + 1;
    const query = { $set: { reviews: updatedReviewsCount } };
    const updateDoc = await mealsCollection.updateOne(filter, query);
    const result = await reviewCollection.insertOne(review);
    res.send({ result, updateDoc });
  });

  app.get("/allReviews",verifyToken, verifyAdmin, async (req, res) => {
    const result = await reviewCollection.find().toArray();
    res.send(result);
  });

  app.get("/reviews", async (req, res) => {
    const mealId = req.query.mealId;
    const query = { MealId: mealId };
    const results = await reviewCollection.find(query).toArray();
    res.send(results);
  });

  app.delete("/deleteReviews/:id",verifyToken, verifyAdmin, async (req, res) => {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const review = await reviewCollection.findOne(query);
    const deleteResult = await reviewCollection.deleteOne(query);
    const mealId = review.MealId;
    const mealQuery = { _id: new ObjectId(mealId) };
    await mealsCollection.updateOne(mealQuery, { $inc: { reviews: -1 } });
    res.send({
      message: "Review deleted and review count updated",
      deleteResult,
    });
  });

  app.delete("/users/:id",verifyToken, verifyAdmin, async (req, res) => {
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

  app.get("/contact",verifyToken, verifyAdmin, async (req, res) => {
    const result = await contactCollection.find().toArray();
    res.send(result);
  });
  app.delete("/contact/:id",verifyToken, verifyAdmin, async (req, res) => {
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
