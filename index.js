const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const cors = require("cors");
const app = express();
const morgan = require("morgan");
const jwt = require("jsonwebtoken");
// middleware
app.use(cors());
app.use(express.json());

if (process.env.NODE_DEV === "development") {
	app.use(morgan("dev"));
}

const port = process.env.PORT || 5000;

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.wjvzlqr.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
	useNewUrlParser: true,
	useUnifiedTopology: true,
	serverApi: ServerApiVersion.v1,
});

function verifyJwt(req, res, next) {
	const authHeader = req.headers.authorization;
	if (!authHeader) {
		return res.status(401).send({ message: "Unauthorized access" });
	}

	const token = authHeader.split(" ")[1];
	jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
		if (err) {
			res.status(403).send({ message: "Forbidden access" });
		}
		req.decoded = decoded;
		next();
	});
}

async function run() {
	try {
		const phonesCollection = client.db("resealPhone").collection("phones");
		const usersCollection = client.db("resealPhone").collection("users");
		const categoriesCollection = client
			.db("resealPhone")
			.collection("categories");

		async function verifySeller(req, res, next) {
			const email = req.decoded.email;
			const query = {
				email,
			};

			const user = await usersCollection.findOne(query);
			if (user?.role !== "seller") {
				res.status(403).send({
					message: "forbidden access",
				});
			}

			next();
		}

		app.get("/", async (req, res) => {
			res.send("Server is running on port 🚀🚀🚀🚀");
		});

		app.get("/user/jwt", async (req, res) => {
			const email = req.query.email;

			const query = {
				email: email,
			};

			const user = await usersCollection.findOne(query);
			console.log("jwt", user);
			let token;
			if (user) {
				token = jwt.sign({ email }, process.env.JWT_SECRET, {
					expiresIn: "7d",
				});
				return res.send({ accessToken: token });
			}

			res.status(403).send({ accessToken: token });
		});
		// create user
		app.post("/users", async (req, res) => {
			const user = req.body;
			const result = await usersCollection.insertOne(user);
			res.send(result);
		});
		// get user by query email
		app.get("/user", async (req, res) => {
			const email = req.query.email;
			const query = {
				email,
			};
			const result = await usersCollection.findOne(query);
			res.send(result);
		});

		// create products
		app.post("/products", verifyJwt, verifySeller, async (req, res) => {
			const data = req.body;
			const currentProduct = {
				...data,
				isAvailable: true,
				createdDate: new Date(),
				isAdvertised: false,
			};
			const result = await phonesCollection.insertOne(currentProduct);
			res.send(result);
		});
		// get my products
		app.get("/myproducts", verifyJwt, verifySeller, async (req, res) => {
			const authorization = req.headers.authorization;

			console.log(authorization);
			const email = req?.decoded?.email;
			const query = {
				email: email,
			};
			const result = await phonesCollection.find(query).toArray();
			res.send(result);
		});
		// delete my products
		app.delete("/myproducts/:id", verifyJwt, verifySeller, async (req, res) => {
			const id = req.params.id;
			const query = {
				_id: ObjectId(id),
			};
			const result = await phonesCollection.deleteOne(query);
			res.send(result);
		});
		// get categories
		app.get("/categories", async (req, res) => {
			const result = await categoriesCollection.find({}).toArray();
			res.send(result);
		});
	} catch (err) {
		console.log(err);
	}
}

run().catch((err) => console.log(err));

app.listen(port, () => {
	console.log(`Server is running on port ${port}`);
});
