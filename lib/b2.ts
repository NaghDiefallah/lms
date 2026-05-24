import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

function getB2Client() {
  return new S3Client({
    endpoint: process.env.B2_ENDPOINT!,
    region: process.env.B2_REGION!,
    credentials: {
      accessKeyId: process.env.B2_KEY_ID!,
      secretAccessKey: process.env.B2_APP_KEY!,
    },
    forcePathStyle: true,
  });
}

const BUCKET = () => process.env.B2_BUCKET!;

export async function uploadToB2(key: string, body: Buffer, contentType: string) {
  const client = getB2Client();
  await client.send(new PutObjectCommand({
    Bucket: BUCKET(),
    Key: key,
    Body: body,
    ContentType: contentType,
  }));
}

export async function deleteFromB2(key: string) {
  const client = getB2Client();
  await client.send(new DeleteObjectCommand({ Bucket: BUCKET(), Key: key }));
}
