you are correct , this is an starter/ skeleton projects for redis-stream in
Deno. now i need you to generate a requirements docuemt (md file) for the
service before continue to add features and improve the service.

before all upgrade the redis client to "jsr:@nelreina/redis-client@0.6.0". and
adjust the application to use the new api. You can find info about the package
at https://jsr.io/@nelreina/redis-client

The service will mostly (97%) run in docker or kubernetes environment i want you
to make sure before when service start that the service is connected to redis ,
if not connected to redis start the service but when docker or kubernetes do
helthcheck respond with Not OK. And log not connected after 1 minute after retry
to connect . After 3 attemps , kill the app

Improve healthcheck to industry standard please / most common use

Suggest features to improve the service in general

Service needs to high available and need to recover fast after failure
