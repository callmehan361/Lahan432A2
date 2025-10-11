import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";
import dotenv from "dotenv";
dotenv.config();

const ssm = new SSMClient({ region: process.env.AWS_REGION });

export async function getParameter(name) {
  const param = await ssm.send(new GetParameterCommand({ Name: name }));
  return param.Parameter.Value;
}
