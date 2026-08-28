import"dotenv/config";import{buildApp}from"./api/app.js";import{loadConfig}from"./config/config.js";
const config=loadConfig(),{app}=buildApp(config);try{await app.listen({host:config.host,port:config.port});process.stdout.write(`Second Take backend listening on http://${config.host}:${config.port}\n`);}catch(error){process.stderr.write(`Backend startup failed: ${String((error as Error).message).slice(0,300)}\n`);process.exitCode=1;}

