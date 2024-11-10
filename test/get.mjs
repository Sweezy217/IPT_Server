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



describe("GET /api/users", () => {
  it("should retrieve a list of users successfully", async () => {
    try {
      const response = await axios.get(`${URL}/api/users`);
      console.log("responseresponse", response);
      
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
      // Simulate no users in the collection (requires test database setup)
      const response = await axios.get(`${URL}/api/users`);
      expect(response.status).to.equal(404);
      expect(response.data).to.have.property("message", "No Users Found.");
    } catch (error) {
      expect(error.response.status).to.equal(404);
      expect(error.response.data).to.have.property("message", "No Users Found.");
    }
  });

  it("should return 500 in case of a server error", async () => {
    try {
      // Simulate a server error (requires mock or modification for test purposes)
      await axios.get(`${URL}/api/users`);
      throw new Error("Expected error but request succeeded");
    } catch (error) {
      expect(error.response.status).to.equal(500);
      expect(error.response.data).to.have.property("message", "Internal Server Error");
    }
  });
});
