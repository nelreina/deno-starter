import { MailtrapClient } from "npm:mailtrap";

const TOKEN = Deno.env.get("MAILTRAP_TOKEN");
const EMAIL = Deno.env.get("MAILTRAP_FROM");
console.info("EMAIL", EMAIL);
const template_uuid = Deno.env.get("MAILTRAP_TEMPLATE_UUID");

export const sendMail = () => {
  const client = new MailtrapClient({
    token: TOKEN,
  });

  const sender = {
    email: EMAIL,
    name: "Jack Em Cura Rentals",
  };
  const recipients = [
    {
      email: "nelreina@gmail.com",
    },
  ];

  client
    .send({
      from: sender,
      to: recipients,
      template_uuid,

      //   category: "Integration Test",
    })
    .then(console.info, console.error);
};
