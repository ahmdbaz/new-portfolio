### A personal portfolio hosted on AWS.

Just a diffrent version of the first portfolio

look for more here: https://github.com/ahmdbaz/portfolio

## Live Demo
https://d372bteboj5fl0.cloudfront.net/

## Deployment
This project uses a CI/CD pipeline via GitHub Actions. Every push to the `main` branch automatically syncs files to S3 and invalidates the CloudFront cache — no manual deployment steps needed.

See [aws-cicd-pipeline](https://github.com/ahmdbaz/aws-cicd-pipeline) for the full pipeline breakdown.
