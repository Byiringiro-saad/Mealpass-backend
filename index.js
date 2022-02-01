//packages
const express = require("express");
const cluster = require("cluster");
const totalCPUs = require("os").cpus().length;

if (cluster.isPrimary) {
  for (let i = 0; i < totalCPUs; i++) {
    cluster.fork();
  }

  cluster.on("exit", (worker, code, signal) => {
    console.log(`worker ${worker.process.pid} died`);
    // console.log("Let's fork another worker!");
    // cluster.fork();
  });
} else {
  //packages
  const cors = require("cors");
  const path = require("path");
  const bodyParser = require("body-parser");
  const dotenv = require("dotenv").config();
  const webPush = require("web-push");

  //files
  const dinerRoutes = require("./routes/diner.routes");
  const cartRoutes = require("./routes/cart.routes");
  const restaurantRoutes = require("./routes/restaurant.routes");
  const dishRoutes = require("./routes/dish.routes");
  const orderRoutes = require("./routes/order.routes");
  const menuRoutes = require("./routes/menu.routes");
  const requestRoutes = require("./routes/request.routes");
  const Diner = require("./models/diner.model");
  const jwt_decode = require("jwt-decode");

  //initialize app
  const app = express();

  //databse
  require("./services/db.service");

  //some configurations
  app.use(cors());
  app.use(bodyParser.json());
  app.set("view engine", "pug");
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(express.static(path.join(__dirname, "public")));
  webPush.setVapidDetails(
    "mailto: sajuengine@gmail.com",
    `${process.env.NOTIF_PUB_KEY}`,
    `${process.env.NOTIF_PRI_KEY}`
  );

  //base endpoints
  app.use("/diner", dinerRoutes);
  app.use("/cart", cartRoutes);
  app.use("/restaurant", restaurantRoutes);
  app.use("/dish", dishRoutes);
  app.use("/order", orderRoutes);
  app.use("/menu", menuRoutes);
  app.use("/request", requestRoutes);

  //reserved endpoints
  app.get("/", (req, res) => {
    res.render("welcome");
  });

  app.post("/notifications/subscribe", async (req, res) => {
    const { id } = jwt_decode(req.body.token);
    await Diner.find({ _id: id }).then(async (response) => {
      if (!response.pushSubscription) {
        await Diner.findOneAndUpdate(
          { _id: id },
          {
            pushSubscription: req.body.subscription,
          }
        )
          .then((response) => {
            webPush
              .sendNotification(
                req.body.subscription,
                JSON.stringify({
                  title: "MealPass",
                  description:
                    "You subscribed to MealPass notifications system",
                  icon: "https://res.cloudinary.com/f-studios/image/upload/v1643705471/android-144x144_pq3teb.png",
                })
              )
              .then((result) => console.log())
              .catch((e) => console.log(e.stack));
          })
          .catch((err) => {
            console.log(err);
          });
      } else {
        webPush
          .sendNotification(
            req.body.subscription,
            JSON.stringify({
              title: "MealPass",
              description: "Welcome back to MealPass",
              icon: "https://res.cloudinary.com/f-studios/image/upload/v1643705471/android-144x144_pq3teb.png",
            })
          )
          .then((result) => console.log())
          .catch((e) => console.log(e.stack));
      }
    });
    res.status(200).json({ success: true });

    // const payload = JSON.stringify({
    //   title: req.body.title,
    //   description: "Test",
    //   icon: "https://res.cloudinary.com/f-studios/image/upload/v1643705471/android-144x144_pq3teb.png",
    // });
    // // console.log(req.body.subscription);
    // webPush
    //   .sendNotification(req.body.subscription, payload)
    //   .then((result) => console.log())
    //   .catch((e) => console.log(e.stack));

    // res.status(200).json({ success: true });
  });

  //start the server
  const PORT = process.env.PORT || 8080;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}
