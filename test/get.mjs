import axios from "axios";
import { expect } from "chai";

const URL = "http://localhost:8000";

describe("GET /userWorkSpaces", () => {
  it("should return 400 if email query parameter is missing", async () => {
    try {
      await axios.get(`${URL}/userWorkSpaces`);
    } catch (error) {
      expect(error.response.status).to.equal(400);
      expect(error.response.data.message).to.equal(
        "Email query parameter is required"
      );
    }
  });

  it("should return 200 and list of workspaces if email has associated workspaces", async () => {
    const response = await axios.get(
      `${URL}/userWorkSpaces?email=siphomkhize217@gmail.com`
    );

    expect(response.status).to.equal(200);
    expect(response.data).to.have.property("message").that.is.an("array");

    response.data.message.forEach((workspace) => {
      expect(workspace).to.have.property("workspaceName");
    });
  });

  it("should return 404 if email has no associated workspaces", async () => {
    try {
      await axios.get(`${URL}/userWorkSpaces?email=no_workspace@example.com`);
    } catch (error) {
      expect(error.response.status).to.equal(404);
      expect(error.response.data.message).to.equal("No workspaces found");
    }
  });
});

describe("GET /users", () => {
  it("should retrieve a list of users successfully", async () => {
    try {
      const response = await axios.get(`${URL}/users`);

      expect(response.status).to.equal(200);
      expect(response.data).to.be.an("array");
      expect(response.data.length).to.be.greaterThan(0);
      response.data.forEach((user) => {
        expect(user).to.have.property("firstName");
        expect(user).to.have.property("lastName");
        expect(user).to.have.property("email");
      });
    } catch (error) {
      throw new Error(`Expected status 200 but got ${error.response.status}`);
    }
  });

  it("should return 404 if no users are found", async () => {
    try {
      const response = await axios.get(`${URL}/users`);
      expect(response.status).to.equal(404);
      expect(response.data).to.have.property("message", "No Users Found.");
    } catch (error) {
      expect(error.response.status).to.equal(404);
      expect(error.response.data).to.have.property(
        "message",
        "No Users Found."
      );
    }
  });

  it("should return 500 in case of a server error", async () => {
    try {
      await axios.get(`${URL}/users`);
      throw new Error("Expected error but request succeeded");
    } catch (error) {
      expect(error.response.status).to.equal(500);
      expect(error.response.data).to.have.property(
        "message",
        "Internal Server Error"
      );
    }
  });
});

describe("This is a post req but because it is getting data it is under get.mjs. POST /getTasks", () => {
  const validRequestData = {
    email: "siphomkhize217@gmail.com",
    workspaceName: "Sweezyville",
  };

  it("should return tasks for the given email and workspace", async () => {
    try {
      const response = await axios.post(`${URL}/getTasks`, validRequestData);
      expect(response.status).to.equal(201);
      expect(response.data).to.have.property("message");
      expect(response.data.message).to.be.an("array");
      expect(response.data.message.length).to.be.greaterThan(0);
    } catch (error) {
      throw new Error(`Expected status 200 but got ${error.response.status}`);
    }
  });

  it("should return 404 if no tasks are found for the given email and workspace", async () => {
    const invalidRequestData = {
      email: "non@gmail.com",
      workspaceName: "Workspace",
    };

    try {
      const response = await axios.post(`${URL}/getTasks`, invalidRequestData);
      console.log("1234", response);

      expect(response.status).to.equal(404);
      expect(response.data).to.have.property("message", "No tasks found");
    } catch (error) {
      throw new Error(`Expected status 404 but got ${error.response.status}`);
    }
  });

  it("should return 500 if there is a server error", async () => {
    try {
      await axios.post(`${URL}/getTasks`, validRequestData);
      throw new Error("Expected error but request succeeded");
    } catch (error) {
      expect(error.response.status).to.equal(500);
      expect(error.response.data).to.have.property(
        "message",
        "Internal Server Error"
      );
    }
  });
});
