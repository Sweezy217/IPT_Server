import axios from "axios";
import { expect } from "chai";

const BASE_URL = "http://3.82.10.171:8000";

describe("POST /createWorkspace", () => {
  // Define sample data for testing
  const validWorkspaceData = {
    firstName: "Sam",
    lastName: "Uel",
    owner_email: "Sam@gmail.com",
    workspaceName: "SamWorkspace",
    password: "strongpassword123",
  };

  it("should create a new workspace and user successfully", async () => {
    try {
      const response = await axios.post(
        `${BASE_URL}/createWorkspace`,
        validWorkspaceData
      );
      expect(response.status).to.equal(201);
      expect(response.data).to.have.property(
        "message",
        "Workspace and User successfully created"
      );
      expect(response.data).to.have.property("userId");
      expect(response.data).to.have.property("workspaceId");
    } catch (error) {
      throw new Error(`Expected status 201 but got ${error.response.status}`);
    }
  });

  it("should fail if the email already owns a workspace", async () => {
    try {
      // Assuming the email is already in use, send a request with the same owner_email
      await axios.post(`${BASE_URL}/createWorkspace`, validWorkspaceData);
      throw new Error("Expected error but request succeeded");
    } catch (error) {
      expect(error.response.status).to.equal(400);
      expect(error.response.data).to.have.property(
        "message",
        "Email already Owns a WorkSpace!!"
      );
    }
  });

  it("should fail if the workspace name is already taken", async () => {
    const duplicateWorkspaceData = {
      ...validWorkspaceData,
      owner_email: "jane.doe@example.com", // New email to bypass email ownership check
    };

    try {
      // Create a new workspace with the same workspaceName but different email
      await axios.post(`${BASE_URL}/createWorkspace`, duplicateWorkspaceData);
      throw new Error("Expected error but request succeeded");
    } catch (error) {
      expect(error.response.status).to.equal(400);
      expect(error.response.data).to.have.property(
        "message",
        "Workspace Name is being Used."
      );
    }
  });

  it("should fail with a 500 error if data is missing", async () => {
    const incompleteData = {
      firstName: "Alice",
      lastName: "Smith",
      owner_email: "alice.smith@example.com",
    };

    try {
      await axios.post(`${BASE_URL}/createWorkspace`, incompleteData);
      throw new Error("Expected error but request succeeded");
    } catch (error) {
      expect(error.response.status).to.equal(500);
      expect(error.response.data)
        .to.have.property("message")
        .that.includes("Internal Server Error");
    }
  });
});

describe("POST /addTask", () => {
  const validTaskData = {
    title: "Complete Project Report",
    description: "Prepare the final report for the project",
    priority: "High",
    startDate: "2024-12-01",
    dueDate: "2024-12-15",
    status: "to do",
    assignee: ["siphomkhize217@gmail.com"],
    email: "siphomkhize217@gmail.com",
    workspaceName: "Sweezyville",
  };

  it("should create a new task successfully", async () => {
    try {
      const response = await axios.post(`${BASE_URL}/addTask`, validTaskData);

      expect(response.status).to.equal(201);
      expect(response.data).to.have.property(
        "message",
        "task Successfully Created"
      );
      expect(response.data).to.have.property("userId");
    } catch (error) {
      throw new Error(`Expected status 201 but got ${error.response.status}`);
    }
  });

  it("should return 400 if required fields are missing", async () => {
    const incompleteTaskData = {
      title: "Complete Project Report",
    };

    try {
      const res = await axios.post(`${BASE_URL}/addTask`, incompleteTaskData);
      expect(res.status).to.equal(400);
      expect(res.data).to.have.property("message", "All fields are required");
    } catch (error) {}
  });

  it("should return 500 in case of a server error", async () => {
    try {
      await axios.post(`${BASE_URL}/addTask`, validTaskData);
      throw new Error("Expected error but request succeeded");
    } catch (error) {
      expect(error.response.status).to.equal(500);
      expect(error.response.data).to.have.property(
        "message",
        `Internal Server Error ${error}`
      );
    }
  });
});

describe("POST /addProject", () => {
  it("should successfully create a new project", async () => {
    const projectData = {
      title: "New Project",
      workspaceName: "Sweezyville",
      description: "A new project for testing",
      priority: "High",
      startDate: "2024-11-01",
      dueDate: "2024-12-01",
      selectedTeamMembers: ["Sipho Mkhize"],
      status: "to do",
    };

    try {
      const response = await axios.post(`${BASE_URL}/addProject`, projectData);

      expect(response.status).to.equal(201);
      expect(response.data).to.have.property(
        "message",
        "project Successfully Created"
      );
      expect(response.data).to.have.property("userId");
    } catch (error) {
      throw new Error(`Expected status 201 but got ${error.response.status}`);
    }
  });

  it("should return an error if project creation fails", async () => {
    const invalidProjectData = [];

    try {
      const response = await axios.post(
        `${BASE_URL}/addProject`,
        invalidProjectData
      );
    } catch (error) {
      expect(error.response.status).to.equal(500);
      expect(error.response.data).to.have.property(
        "message",
        "Internal Server Error"
      );
    }
  });
});
