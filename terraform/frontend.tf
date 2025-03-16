### 🚀 Frontend Infrastructure

# Reference existing data bucket
data "aws_s3_bucket" "data" {
  bucket = "aolf-gsec-prod"
}

# Create a new bucket specifically for frontend code
resource "aws_s3_bucket" "frontend_code" {
  bucket = "aolf-gsec-prod-frontend"
  
  tags = {
    Name = "aolf-gsec-prod-frontend-code"
    Purpose = "Frontend application code"
  }
}

# Enable versioning for the frontend code bucket
resource "aws_s3_bucket_versioning" "frontend_code" {
  bucket = aws_s3_bucket.frontend_code.id
  
  versioning_configuration {
    status = "Enabled"
  }
}

# S3 bucket policy to allow CloudFront access to frontend code
resource "aws_s3_bucket_policy" "frontend_code" {
  bucket = aws_s3_bucket.frontend_code.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action = "s3:GetObject"
        Resource = "${aws_s3_bucket.frontend_code.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.frontend.arn
          }
        }
      }
    ]
  })
}

# S3 bucket policy for the data bucket to allow CloudFront access
resource "aws_s3_bucket_policy" "data" {
  bucket = data.aws_s3_bucket.data.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action = "s3:GetObject"
        Resource = "${data.aws_s3_bucket.data.arn}/prod/attachments/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.frontend.arn
          }
        }
      }
    ]
  })
}

# S3 bucket configuration for website hosting
resource "aws_s3_bucket_website_configuration" "frontend_code" {
  bucket = aws_s3_bucket.frontend_code.id
  
  index_document {
    suffix = "index.html"
  }
  
  error_document {
    key = "error.html"
  }
}

# Use existing ACM certificate for CloudFront
data "aws_acm_certificate" "frontend" {
  provider    = aws.us-east-1
  domain      = "meetgurudev.aolf.app"
  statuses    = ["ISSUED"]
  most_recent = true
}

# CloudFront origin access control for S3
resource "aws_cloudfront_origin_access_control" "frontend" {
  name                              = "aolf-gsec-prod-frontend-oac"
  description                       = "OAC for AOLF GSEC Frontend"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# CloudFront distribution for frontend
resource "aws_cloudfront_distribution" "frontend" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  price_class         = "PriceClass_100"  # Use only North America and Europe edge locations
  
  # Frontend code origin
  origin {
    domain_name              = aws_s3_bucket.frontend_code.bucket_regional_domain_name
    origin_id                = "S3-Frontend-Code"
    origin_access_control_id = aws_cloudfront_origin_access_control.frontend.id
  }
  
  # Data bucket origin
  origin {
    domain_name              = data.aws_s3_bucket.data.bucket_regional_domain_name
    origin_id                = "S3-Data"
    origin_path              = "/prod/attachments"
    origin_access_control_id = aws_cloudfront_origin_access_control.frontend.id
  }
  
  # Default cache behavior for frontend code
  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3-Frontend-Code"
    viewer_protocol_policy = "redirect-to-https"
    
    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
    
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
    compress               = true
  }
  
  # Cache behavior for attachments access
  ordered_cache_behavior {
    path_pattern           = "/attachments/*"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3-Data"
    viewer_protocol_policy = "redirect-to-https"
    
    forwarded_values {
      query_string = true
      cookies {
        forward = "none"
      }
    }
    
    min_ttl                = 0
    default_ttl            = 300  # Shorter TTL for data
    max_ttl                = 1800
    compress               = true
  }
  
  # Custom error response for SPA routing
  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 10
  }
  
  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 10
  }
  
  # Restrictions
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }
  
  # SSL certificate
  viewer_certificate {
    acm_certificate_arn      = data.aws_acm_certificate.frontend.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
  
  # Custom domain
  aliases = ["meetgurudev.aolf.app"]
  
  tags = {
    Name = "aolf-gsec-prod-frontend-distribution"
  }
}

# Output the CloudFront distribution ID and domain
output "cloudfront_distribution_id" {
  value       = aws_cloudfront_distribution.frontend.id
  description = "The CloudFront distribution ID for the frontend"
}

output "cloudfront_domain_name" {
  value       = aws_cloudfront_distribution.frontend.domain_name
  description = "The CloudFront domain name for the frontend"
}

output "frontend_website_endpoint" {
  value       = "https://meetgurudev.aolf.app"
  description = "The custom domain for the frontend"
}

output "frontend_code_bucket" {
  value       = aws_s3_bucket.frontend_code.bucket
  description = "The S3 bucket name for frontend code"
}

output "data_bucket" {
  value       = data.aws_s3_bucket.data.bucket
  description = "The S3 bucket name for application data"
}

# Provider configuration for us-east-2 region (required for CloudFront certificates)
provider "aws" {
  alias  = "us-east-2"
  region = "us-east-2"
} 