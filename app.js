const express = require("express");
const app = express();
app.use(express.json());
module.exports = app;
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const path = require("path");
const dbPath = path.join(__dirname, "covid19IndiaPortal.db");
const initializeDBandServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(2005, () => {
      console.log("Server Running Successfully at http://localhost:2005/");
    });
  } catch (e) {
    console.log(`DB.ERROR ${e.message}`);
    process.exit(1);
  }
};
initializeDBandServer();

const authenticateToken = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
    jwt.verify(jwtToken, "MY_SECRET_KEY", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  } else {
    response.status(401);
    response.send("Invalid JWT Token");
  }
};

const camelCase = (data) => {
  return {
    stateId: data.state_id,
    stateName: data.state_name,
    population: data.population,
  };
};
const camelCase1 = (data) => {
  return {
    districtId: data.district_id,
    districtName: data.district_name,
    stateId: data.state_id,
    cases: data.cases,
    cured: data.cured,
    active: data.active,
    deaths: data.deaths,
  };
};
//API-1
app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `SELECT * FROM user WHERE username='${username}';`;
  const getUser = await db.get(selectUserQuery);
  if (getUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const verifyPassword = await bcrypt.compare(password, getUser.password);
    if (verifyPassword === true) {
      const payload = {
        username: username,
      };
      const jwtToken = jwt.sign(payload, "MY_SECRET_KEY");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});
//API-2 Select all states
app.get("/states/", authenticateToken, async (request, response) => {
  const getStates = `SELECT * FROM state;`;
  const getAllStates = await db.all(getStates);
  response.send(
    getAllStates.map((data) => {
      return {
        stateId: data.state_id,
        stateName: data.state_name,
        population: data.population,
      };
    })
  );
});
//Get specific state API-3
app.get("/states/:stateId/", authenticateToken, async (request, response) => {
  const { stateId } = request.params;
  const GetState = `SELECT * FROM state WHERE state_id=${stateId};`;
  const State = await db.get(GetState);
  response.send(camelCase(State));
});
//Create a district API-4
app.post("/districts/", authenticateToken, async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const addQuery = `INSERT INTO district(district_name,state_id,cases,cured,active,deaths) VALUES
  ('${districtName}',${stateId},${cases},${cured},${active},${deaths});`;
  const AddQuery = await db.run(addQuery);
  response.send("District Successfully Added");
});
//GET a district API-5
app.get(
  "/districts/:districtId/",
  authenticateToken,
  async (request, response) => {
    const { districtId } = request.params;
    const GetDistrictQuery = `SELECT * FROM district WHERE district_id=${districtId};`;
    const District = await db.get(GetDistrictQuery);
    response.send(camelCase1(District));
  }
);
//Delete a district API-6
app.delete(
  "/districts/:districtId/",
  authenticateToken,
  async (request, response) => {
    const { districtId } = request.params;
    const deleteDistrictQuery = `DELETE FROM district WHERE district_id=${districtId};`;
    const deleteDistrict = await db.run(deleteDistrictQuery);
    response.send("District Removed");
  }
);
//Update a district API-7
app.put(
  "/districts/:districtId/",
  authenticateToken,
  async (request, response) => {
    const { districtId } = request.params;
    const {
      districtName,
      stateId,
      cases,
      cured,
      active,
      deaths,
    } = request.body;
    const updateDistrict = `UPDATE district SET 
    district_name='${districtName}',
    state_id=${stateId},
    cases=${cases},
    cured=${cured},
    active=${active},
    deaths=${deaths};`;
    const UpdateQuery = await db.run(updateDistrict);
    response.send("District Details Updated");
  }
);
//stats of district API-8
app.get(
  "/states/:stateId/stats/",
  authenticateToken,
  async (request, response) => {
    const { stateId } = request.params;
    const AllQuery = `SELECT sum(cases) as totalCases,
    sum(cured) as totalCured,sum(active) as totalActive,
    sum(deaths) as totalDeaths FROM district WHERE state_id=${stateId};`;
    const totalQuery = await db.get(AllQuery);
    response.send(totalQuery);
  }
);
