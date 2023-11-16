const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// verify middleware
const verifyToken = (req, res, next) => {
  const token = req?.cookies?.token;
  if (!token) {
    return res.status(401).send({ message: "access denied" });
  }
  jwt.verify(token, process.env.TOKEN, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "access denied" });
    }
    req.user = decoded;
    next();
  });
};

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.yshawkz.mongodb.net/?retryWrites=true&w=majority`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // rooms category data collection
    const roomsCollection = client.db("hotelBookings").collection("rooms");
    const bookingCollection = client.db("hotelBookings").collection("bookings");
    const reviewsCollection = client.db("hotelBookings").collection("reviews");

    // JWT related API
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.TOKEN, {
        expiresIn: "1h",
      });

      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ auth: true });
    });

    // Clear cokkie API
    app.post("/logout", async (req, res) => {
      const user = req.body;
      res
        .clearCookie("token", { maxAge: 0, secure: true, sameSite: "none" })
        .send({ clear: true });
    });

    // All Get related API
    app.get("/rooms", async (req, res) => {
      const cursor = roomsCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.patch("/rooms/:id", async (req, res) => {
      const id = req.params.id
      const filter = { _id: new ObjectId(id) }
      const identifier = req.body
      const updatedData = {
        $set: {
          status: identifier.status
        }
      }
      const result = await roomsCollection.updateOne(filter, updatedData)
      // console.log(id);
      res.send(result)
    })

    app.get("/rooms/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const options = {
        projection: {
          roomCategory: 1,
          description: 1,
          pricePerNight: 1,
          imageLg: 1,
          facilities: 1,
          roomSize: 1,
          availability: 1,
          specialOffers: 1,
          unavailableRoomInfo: 1,
          nextAvailableDate: 1,
          reasonForUnavailability: 1,
          reviews: 1,
          bookingDuration: 1,
          roomSummary: 1,
          maxPerson: 1,
        },
      };

      const result = await roomsCollection.findOne(query, options);
      res.send(result);
    });

    // booking operation
    app.get("/bookings", verifyToken, async (req, res) => {
      console.log(req.query.email);
      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email };
      }
      const result = await bookingCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/bookings", async (req, res) => {
      const booking = req.body;
      console.log(booking);
      const result = await bookingCollection.insertOne(booking);
      res.send(result);
    });

    // getting single booking
    app.get("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      // console.log(id);
      const query = { _id: new ObjectId(id) };
      const result = await bookingCollection.findOne(query);
      res.send(result);
    });

    // reviews collection
    app.get("/reviews", async (req, res) => {
      const cursor = reviewsCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // review post methode
    app.post("/reviews", async (req, res) => {
      const review = req.body;
      // console.log(review);
      const result = await reviewsCollection.insertOne(review);
      res.send(result);
    });

    // Booking data delete
    app.delete('/bookings/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await bookingCollection.deleteOne(query)
      res.send(result);
    })

    // Booking Update methode
    app.patch('/bookings/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updatedBooking = req.body;
      console.log(updatedBooking);
      const updateDoc = {
        $set: {
          checkingDate: updatedBooking.checkingDate,
          checkOutdate: updatedBooking.checkOutdate
        },
      };
      const result = await bookingCollection.updateOne(filter, updateDoc);
      res.send(result);
    })


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

// root
app.get("/", (req, res) => {
  res.send("Green Villa server is running");
});

app.listen(port, () => {
  console.log(`Green Villa server is running on port: ${port}`);
});
