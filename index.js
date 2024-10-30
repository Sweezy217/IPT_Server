require("dotenv").config();
const express = require("express");
const app = express();
const { MongoClient, ObjectId } = require("mongodb");
const port = process.env.PORT || 3000;
const cors = require("cors");
const bcrypt = require("bcrypt");
// const multer = require("multer");
const nodemailer = require("nodemailer");
const saltRounds = 10;
const mongoUrl = process.env.URL;

// Middleware
// const storage = multer.memoryStorage();
// const upload = multer({ storage });
app.use(express.json());
app.use(cors());
let client, db;

const connectMongo = async () => {
  try {
    client = new MongoClient(mongoUrl, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    await client.connect();
    db = client.db("IT-Project-Tracker-DB");

    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  } catch (err) {
    console.error("Failed to connect to MongoDB", err);
  }
};

// async function auth(req, res, next) {
//   const head = req.headers.authorization;

//   if (!head || !head.startsWith("Basic ")) {
//     return res.status(401).json({ message: "Invalid Authorization header" });
//   }

//   const base64Credentials = head.split(" ")[1];
//   const credentials = Buffer.from(base64Credentials, "base64").toString(
//     "utf-8"
//   );
//   const [email, password] = credentials.split(":");

//   const collection = db.collection("Users");
//   const user = await collection.findOne({ email });

//   if (!user) {
//     return res.status(401).json({ message: "No user" });
//   }

//   // Ensure to store hashed passwords and compare hashes in production
//   if (user.password !== password) {
//     return res.status(401).json({ message: "Wrong password" });
//   }

//   req.user = user;
//   next();
// }

app.post("/signup", async (req, res) => {
  const { email, password, workspaceName } = req.body;

  try {
    const UserCollection = db.collection("Users");
    const InvitesCollection = db.collection("Invites");
    const UserWorkSpaces = db.collection("UserWorkSpaces");

    // Check if user exists in Users collection
    const existingUserInUsers = await UserCollection.findOne({ email });

    // Handle existing user logic
    if (existingUserInUsers) {
      const invitedUser = await InvitesCollection.findOne({
        email,
        workspaceName,
      });
      if (!invitedUser) {
        return res.status(404).json({
          message:
            "User already exists, but no invite found. Please contact the workspace owner.",
        });
      }

      const existingUserInWorkspace = await UserWorkSpaces.findOne({
        email,
        workspaceName,
      });
      if (existingUserInWorkspace) {
        return res.status(400).json({
          message: "User already exists in the workspace. Please log in.",
        });
      }

      await UserWorkSpaces.insertOne({
        firstName: existingUserInUsers.firstName,
        lastName: existingUserInUsers.lastName,
        email,
        workspaceName,
        roles: invitedUser.roles,
        created_at: new Date(),
      });

      return res
        .status(201)
        .json({ message: "User successfully added to workspace." });
    }

    // Handle new user logic
    const invitedUser = await InvitesCollection.findOne({
      email,
      workspaceName,
    });
    if (!invitedUser) {
      return res.status(404).json({
        message:
          "User does not exist. Please contact the workspace owner to invite you.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const user = req.body;
    delete user.workspaceName;
    // Insert new user without workspaceName
    await UserCollection.insertOne({
      ...user,
      password: hashedPassword,
      created_at: new Date(),
    });

    delete user.password;
    // Add new user to workspace
    await UserWorkSpaces.insertOne({
      ...user,
      email,
      workspaceName,
      roles: invitedUser.roles,
      created_at: new Date(),
    });

    res
      .status(201)
      .json({ message: "User successfully created and added to workspace." });
  } catch (error) {
    console.error("Error adding user", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.post("/teamMembers", async (req, res) => {
  const { org } = req.body;
  const UserWorkSpaces = db.collection("UserWorkSpaces");

  try {
    const teamMembers = await UserWorkSpaces.find({
      org,
    }).toArray();

    if (teamMembers.length < 1) {
      return res.status(404).send({ message: "Team Members Not Found." });
    }

    return res.status(200).json({ teamMembers: teamMembers });
  } catch (error) {
    return res.status(500).send({ message: `Internal Server Error: ${error}` });
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await db.collection("Users").findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "Invalid email" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(400).json({ message: "Invalid password" });
    }
    delete user["password"];

    // const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    return res.json({ message: "Login successful", user: user });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/createWorkspace", async (req, res) => {
  const { firstName, lastName, owner_email, workspaceName, password } =
    req.body;
  const session = client.startSession(); // Start a session for the transaction

  try {
    const workspacesCollection = db.collection("WorkSpaces");
    const usersCollection = db.collection("Users");
    const userWorkSpacesCollection = db.collection("UserWorkSpaces");

    // Start the transaction
    session.startTransaction();

    // Check if a user with the provided email already exists
    const existingUser = await workspacesCollection.findOne(
      { owner_email: owner_email },
      { session }
    );
    if (existingUser) {
      await session.abortTransaction();
      return res
        .status(400)
        .json({ message: "Email already Owns a WorkSpace!!" });
    }

    // Check if the workspace already exists
    const existingWorkspace = await workspacesCollection.findOne(
      { workspaceName },
      { session }
    );
    if (existingWorkspace) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Workspace Name is being Used." });
    }

    // Hash the user's password
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insert new user into the Users collection
    const userResult = await usersCollection.insertOne(
      {
        firstName,
        lastName,
        email: owner_email,
        password: hashedPassword,
        created_at: new Date(),
      },
      { session }
    );

    if (!userResult) {
      await session.abortTransaction();
      throw new Error("Failed to save the user");
    }

    // Prepare the workspace data by removing sensitive fields
    const newWorkspaceData = { ...req.body };
    delete newWorkspaceData.password;
    delete newWorkspaceData.firstName;
    delete newWorkspaceData.lastName;

    // Insert the new workspace into the WorkSpaces collection
    const workspaceResult = await workspacesCollection.insertOne(
      {
        ...newWorkspaceData,
        created_at: new Date(),
      },
      { session }
    );

    if (!workspaceResult) {
      await session.abortTransaction();
      throw new Error("Failed to save the workspace");
    }

    // Insert the user into the UserWorkSpaces collection
    const userWorkspaceResult = await userWorkSpacesCollection.insertOne(
      {
        firstName,
        lastName,
        email: owner_email,
        workspaceName: workspaceName,
        roles: ["Admin"],
        created_at: new Date(),
      },
      { session }
    );

    if (!userWorkspaceResult) {
      await session.abortTransaction();
      throw new Error("Failed to save the user to UserWorkSpace");
    }

    // Commit the transaction once all operations are successful
    await session.commitTransaction();
    session.endSession();

    // Respond with a success message
    res.status(201).json({
      message: "Workspace and User successfully created",
      userId: userResult.insertedId,
      workspaceId: workspaceResult.insertedId,
    });
  } catch (error) {
    await session.abortTransaction(); // Roll back the transaction in case of error
    session.endSession();
    console.error("Error creating workspace or user:", error);
    res.status(500).json({ message: `Internal Server Error ${error}` });
  }
});

app.get("/userWorkSpaces", async (req, res) => {
  const email = req.query.email;
  const UserWorkSpaces = db.collection("UserWorkSpaces");

  if (!email) {
    return res
      .status(400)
      .send({ message: "Email query parameter is required" });
  }

  try {
    const workspaces = await UserWorkSpaces.find({ email }).toArray();

    if (workspaces.length > 0) {
      const workspaceNames = workspaces.map((item) => ({
        workspaceName: item.workspaceName,
      }));

      return res.status(200).send({ message: workspaceNames });
    } else {
      return res.status(404).send({ message: "No workspaces found" });
    }
  } catch (error) {
    console.error("Error fetching workspaces:", error);
    return res.status(500).send({ message: "Internal server error" });
  }
});

app.post("/invite", async (req, res) => {
  const { email, workspaceName } = req.body;
  const invitesCollection = db.collection("Invites");

  try {
    // Find all invites with the specified email
    const invitedUsers = await invitesCollection.find({ email }).toArray();

    // Check if the user is already part of the specified workspace
    const userInWorkspace = invitedUsers.some(
      (user) => user.workspaceName === workspaceName
    );

    if (userInWorkspace) {
      return res
        .status(400)
        .json({ message: `User already exists in ${workspaceName}.` });
    }

    // Insert new invite
    const result = await invitesCollection.insertOne({
      ...req.body,
      created_at: new Date(),
    });

    if (result.insertedId) {
      return res.status(200).json({
        message: `User successfully invited to ${workspaceName}.`,
      });
    } else {
      return res.status(500).json({ message: "Failed to invite user." });
    }
  } catch (error) {
    console.error("Error inviting user:", error);
    return res.status(500).json({
      message: "An error occurred while inviting the user.",
    });
  }
});

app.get("api/users", async (req, res) => {
  try {
    const collection = db.collection("Users");
    const data = await collection.find({}).toArray();
    if (data.length < 1) {
      return res.status(404).send({ message: "No Users Found." });
    }
    res.status(200).json(data);
  } catch (error) {
    res.status(500).send({ message: "Internal Server Error", error });
  }
});

app.get("/users/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const collection = db.collection("Users");
    const user = await collection.findOne({ _id: new ObjectId(userId) });
    if (!user) {
      return res.status(404).send({ message: "User Not Found." });
    }
    res.status(200).json(user);
  } catch (error) {
    res.status(500).send({ message: "Internal Server Error", error });
  }
});

app.put("/user", async (req, res) => {
  const userId = req.query.userid;
  const newUserData = req.body;

  try {
    const collection = db.collection("Users");
    const result = await collection.updateOne(
      { _id: new ObjectId(userId) },
      { $set: newUserData }
    );

    if (result.matchedCount == 1) {
      res.status(200).send({ message: "User updated successfully" });
    } else {
      res.status(404).send({ message: "User not found" });
    }
  } catch (error) {
    console.error("An error occurred while updating the user", error);
    res.status(500).send({ message: "Internal Server Error" });
  }
});

app.post("/addTask", async (req, res) => {
  try {
    const task = req.body;
    const collection = db.collection("Tasks");

    // Store the user with the hashed password
    const result = await collection.insertOne({
      ...task,
      created_at: new Date(),
    });

    res.status(201).json({
      message: "task Successfully Created",
      userId: result.insertedId,
    });
  } catch (error) {
    console.log("Error adding task", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.post("/getTasks", async (req, res) => {
  try {
    const { email, workspaceName } = req.body;
    const collection = db.collection("Tasks");

    const result = await collection
      .find({
        email,
        workspaceName,
      })
      .toArray();

    res.status(201).json({
      message: result,
    });
  } catch (error) {
    console.log("Error fetching tasks", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.delete("/deletetask", async (req, res) => {
  console.log(req.body);
  const { id, workspaceName } = req.body;
  const collection = db.collection("Tasks");
  const taskId = new ObjectId(id);

  try {
    // Delete the task based on both id and workspaceName
    const result = await collection.deleteOne({
      _id: taskId,
      workspaceName: workspaceName,
    });

    if (result.deletedCount === 1) {
      return res.status(200).send({ message: "Task deleted successfully" });
    } else {
      return res.status(404).send({ message: "Task not found" });
    }
  } catch (error) {
    console.error("An error occurred while deleting the task", error);
    return res.status(500).send({ message: "Internal Server Error" });
  }
});

app.put("/movetask", async (req, res) => {
  const { id, selection } = req.body;
  const collection = db.collection("Tasks");
  const taskId = new ObjectId(id);

  try {
    // Delete the task based on both id and workspaceName
    const result = await collection.updateOne(
      { _id: taskId },
      { $set: { status: selection } }
    );

    if (result.matchedCount === 1) {
      return res.status(200).send({ message: "Task moved successfully" });
    } else {
      return res.status(404).send({ message: "Task not found" });
    }
  } catch (error) {
    console.error("An error occurred while moving the task", error);
    return res.status(500).send({ message: "Internal Server Error" });
  }
});

app.put("/editmember", async (req, res) => {
  const { id } = req.body;
  const { firstName, lastName, role } = req.body;
  const collection = db.collection("UserWorkSpaces");
  const memberId = new ObjectId(id);

  try {
    const result = await collection.updateOne(
      { _id: memberId },
      { $set: { firstName: firstName, lastName: lastName, role: role } }
    );

    if (result.matchedCount === 1) {
      return res.status(200).send({ message: "Member updated successfully" });
    } else {
      return res.status(404).send({ message: "Member not found" });
    }
  } catch (error) {
    console.error("An error occurred while updating the Member", error);
    return res.status(500).send({ message: "Internal Server Error" });
  }
});

app.put("/update-user", async (req, res) => {
  const email = req.query.email;
  const newUserData = req.body;
  const user = db.collection("Users");

  try {
    const result = await user.updateOne(
      { email: email },
      { $set: newUserData }
    );

    if (result.matchedCount == 1) {
      return res.status(200).send({ message: "User updated successfully" });
    } else {
      return res.status(404).send({ message: "User not found" });
    }
  } catch (error) {
    console.error("An error occurred while updating the user", error);
    return res.status(500).send({ message: "Internal Server Error" });
  }
});

app.post("/deleteUser", async (req, res) => {
  const { email, workspaceName } = req.body;
  try {
    const UserWorkSpaces = db.collection("UserWorkSpaces");

    const result = await UserWorkSpaces.deleteOne({
      email: email,
      workspaceName: workspaceName,
    });

    if (result.deletedCount === 1) {
      res.status(200).send({ message: "User deleted successfully" });
    } else {
      res.status(404).send({ message: "User not found" });
    }
  } catch (error) {
    console.error("An error occurred while deleting the user", error);
    res.status(500).send({ message: "Internal Server Error" });
  }
});

app.post("/addProject", async (req, res) => {
  try {
    const project = req.body;
    const collection = db.collection("Projects");

    // Store the user with the hashed password
    const result = await collection.insertOne({
      ...project,
      created_at: new Date(),
    });

    res.status(201).json({
      message: "project Successfully Created",
      userId: result.insertedId,
    });
  } catch (error) {
    console.log("Error adding project", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.post("/getProject", async (req, res) => {
  try {
    const { workspaceName } = req.body;
    const collection = db.collection("Projects");

    const result = await collection
      .find({
        workspaceName,
      })
      .toArray();

    res.status(201).json({
      message: result,
    });
  } catch (error) {
    console.log("Error fetching projects", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// app.post(
//   "/upload-profile-image",
//   upload.single("profileImage"),
//   async (req, res) => {
//     try {
//       const userId = req.body.userId;

//       // Create or update user profile with image
//       const profileImage = {
//         data: req.file.buffer,
//         contentType: req.file.mimetype,
//       };

//       const result = await db
//         .collection("users")
//         .updateOne(
//           { _id: new ObjectId(userId) },
//           { $set: { profileImage } },
//           { upsert: true }
//         );

//       res.send("Profile image uploaded successfully!");
//     } catch (err) {
//       console.error("Error uploading image:", err);
//       res.status(500).send("Error uploading image");
//     }
//   }
// );
connectMongo();
