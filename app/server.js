/*
This is the main Node.js server script for your project
- The two endpoints this back-end provides are defined in fastify.get and fastify.post below
*/

const path = require("path");
const axios = require("axios");
const req = require("request");

// Preflight
const preUrl = `https://platform.antares.id:8443/~`;
const url = `https://platform.antares.id:8443/~/antares-cse/antares-id/smartAquarium/feedingMachine`;
const accessKey = `a8ef1dd3211f65d6:19c53276f2829669`;

// Require the fastify framework and instantiate it
const fastify = require("fastify")({
  // Set this to true for detailed logging:
  logger: true
});

// ADD FAVORITES ARRAY VARIABLE FROM README HERE

// Setup our static files
fastify.register(require("fastify-static"), {
  root: path.join(__dirname, "public"),
  prefix: "/" // optional: default '/'
});

// fastify-formbody lets us parse incoming forms
fastify.register(require("fastify-formbody"));

// point-of-view is a templating manager for fastify
fastify.register(require("point-of-view"), {
  engine: {
    handlebars: require("handlebars")
  }
});

// Load and parse SEO data
const seo = require("./src/seo.json");
if (seo.url === "glitch-default") {
  seo.url = `https://${process.env.PROJECT_DOMAIN}.glitch.me`;
}

// Our home page route, this returns src/pages/index.hbs with data built into it
// fastify.get("/", function(request, reply) {
//   // params is an object we'll pass to our handlebars template
//   let params = { seo: seo };
//   // If someone clicked the option for a random color it'll be passed in the querystring
//   if (request.query.randomize) {
//     // We need to load our color data file, pick one at random, and add it to the params
//     const colors = require("./src/colors.json");
//     const allColors = Object.keys(colors);
//     let currentColor = allColors[(allColors.length * Math.random()) << 0];
//     // Add the color properties to the params object
//     params = {
//       color: colors[currentColor],
//       colorError: null,
//       seo: seo
//     };
//   }
//   // The Handlebars code will be able to access the parameter values and build them into the page
//   reply.view("/src/pages/index.hbs", params);
// });

// A POST route to handle and react to form submissions
fastify.post("/", function(request, reply) {
  // Build the params object to pass to the template
  let params = { seo: seo };
  // If the user submitted a color through the form it'll be passed here in the request body
  let color = request.body.color;
  // If it's not empty, let's try to find the color
  if (color) {
    // ADD CODE FROM README HERE TO SAVE SUBMITTED FAVORITES

    // Load our color data file
    const colors = require("./src/colors.json");
    // Take our form submission, remove whitespace, and convert to lowercase
    color = color.toLowerCase().replace(/\s/g, "");
    // Now we see if that color is a key in our colors object
    if (colors[color]) {
      // Found one!
      params = {
        color: colors[color],
        colorError: null,
        seo: seo
      };
    } else {
      // No luck! Return the user value as the error property
      params = {
        colorError: request.body.color,
        seo: seo
      };
    }
  }
  // The Handlebars template will use the parameter values to update the page with the chosen color
  reply.view("/src/pages/index.hbs", params);
});

fastify.get("/", function(request, reply) {
  axios
    .get(`${url}?fu=1&ty=4&drt=1`, {
      headers: {
        accept: "application/json",
        "content-type": "application/json;",
        "x-m2m-origin": accessKey
      }
    })
    .then(function(response) {
      let deviceId = response.data["m2m:uril"][0];

      axios
        .get(`${preUrl}${deviceId}`, {
          headers: {
            accept: "application/json",
            "content-type": "application/json;",
            "x-m2m-origin": accessKey
          }
        })
        .then(function(resp) {
          let result = resp.data["m2m:cin"];

          reply.view("/src/pages/index.hbs", result);
        });
    });
});

fastify.post("/set/schedule", (request, reply) => {
  let body = request.body;
  
    let params = {
      aquaID: body.aquaID,
      desc: body.desc,
      temperature: body.temperature,
      humidity: body.humidity,
      schedule: body.schedule,
      feed: body.feed,
      isFeeding: body.isFeeding,
      trigFeeding: body.trigFeeding
    };

    let data = {
      "m2m:cin": {
        con: JSON.stringify(params)
      }
    };

    const options = {
      method: 'POST',
      url: url,
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json;ty=4',
        'x-m2m-origin': accessKey
      },
      body: JSON.stringify(data)
    };

    req(options, function (error, response, body) {
      if (!error) {
        reply
        .code(201)
        .header('Content-Type', 'application/json; charset=utf-8')
        .send({ status: 'OK' })
      }
    });
});


fastify.post("/set/feed", (request, reply) => {
  let body = request.body;
  
    let params = {
      aquaID: body.aquaID,
      desc: body.desc,
      temperature: body.temperature,
      humidity: body.humidity,
      schedule: body.schedule,
      feed: body.feed,
      isFeeding: body.isFeeding,
      trigFeeding: body.trigFeeding
    };

    let data = {
      "m2m:cin": {
        con: JSON.stringify(params)
      }
    };

    const options = {
      method: 'POST',
      url: url,
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json;ty=4',
        'x-m2m-origin': accessKey
      },
      body: JSON.stringify(data)
    };

    req(options, function (error, response, body) {
      if (!error) {
        reply
        .code(201)
        .header('Content-Type', 'application/json; charset=utf-8')
        .send({ status: 'OK' })
      }
    });
});

// Run the server and report out to the logs
fastify.listen(process.env.PORT, function(err, address) {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  console.log(`Your app is listening on ${address}`);
  fastify.log.info(`server listening on ${address}`);
});
