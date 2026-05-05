// SEO Metadata Builder — generates Open Graph, Twitter Card, and structured data
class SEOMetadata {
  static buildProfileMetadata(profile, baseUrl) {
    return {
      title: `${profile.first_name} ${profile.last_name} | AquaTerra Community`,
      description: profile.bio || `Member of the AquaTerra Community Platform focused on environmental learning and collaboration.`,
      image: profile.profile_picture_url || `${baseUrl}/default-profile.png`,
      url: `${baseUrl}/profile/${profile.uuid}`,
      type: 'profile',
      profile: {
        firstName: profile.first_name,
        lastName: profile.last_name,
        username: profile.username,
      }
    };
  }

  static buildTeamMetadata(team, baseUrl) {
    return {
      title: `${team.team_name} | AquaTerra Community`,
      description: team.description || `Team on the AquaTerra Community Platform for environmental learning.`,
      image: team.team_image_url || `${baseUrl}/default-team.png`,
      url: `${baseUrl}/team/${team.team_id}`,
      type: 'organization',
      organization: {
        name: team.team_name,
        description: team.description,
        memberCount: team.member_count,
      }
    };
  }

  static buildPostMetadata(post, author, baseUrl) {
    return {
      title: post.content.substring(0, 60) + '... | AquaTerra',
      description: post.content.substring(0, 155),
      image: post.image_url || author.profile_picture_url || `${baseUrl}/default-post.png`,
      url: `${baseUrl}/post/${post.feed_post_id}`,
      type: 'article',
      article: {
        publishedTime: post.created_at,
        modifiedTime: post.updated_at,
        author: author.username,
        authorUrl: `${baseUrl}/profile/${author.uuid}`,
      }
    };
  }

  static buildSchoolMetadata(school, baseUrl) {
    return {
      title: `${school.school_name} | AquaTerra Community`,
      description: school.description || `Educational institution on AquaTerra Community Platform.`,
      image: school.school_image_url || `${baseUrl}/default-school.png`,
      url: `${baseUrl}/school/${school.school_id}`,
      type: 'organization',
      organization: {
        name: school.school_name,
        address: school.address,
        phone: school.phone,
      }
    };
  }

  static generateOpenGraphTags(metadata) {
    return {
      'og:title': metadata.title,
      'og:description': metadata.description,
      'og:image': metadata.image,
      'og:url': metadata.url,
      'og:type': metadata.type === 'profile' ? 'profile' : 'website',
      ...(metadata.profile && {
        'profile:first_name': metadata.profile.firstName,
        'profile:last_name': metadata.profile.lastName,
        'profile:username': metadata.profile.username,
      }),
      ...(metadata.article && {
        'article:published_time': metadata.article.publishedTime,
        'article:modified_time': metadata.article.modifiedTime,
        'article:author': metadata.article.authorUrl,
      }),
      'twitter:card': 'summary_large_image',
      'twitter:title': metadata.title,
      'twitter:description': metadata.description,
      'twitter:image': metadata.image,
    };
  }

  static generateJSONLD(metadata, baseUrl) {
    const baseSchema = {
      '@context': 'https://schema.org',
      '@type': this.mapTypeToSchema(metadata.type),
      name: metadata.title,
      description: metadata.description,
      image: metadata.image,
      url: metadata.url,
    };

    if (metadata.type === 'profile') {
      return {
        ...baseSchema,
        '@type': 'Person',
        givenName: metadata.profile.firstName,
        familyName: metadata.profile.lastName,
        identifier: metadata.profile.username,
      };
    }

    if (metadata.type === 'organization') {
      return {
        ...baseSchema,
        '@type': 'Organization',
        ...(metadata.organization.memberCount && {
          numberOfEmployees: metadata.organization.memberCount,
        }),
      };
    }

    if (metadata.type === 'article') {
      return {
        ...baseSchema,
        '@type': 'BlogPosting',
        datePublished: metadata.article.publishedTime,
        dateModified: metadata.article.modifiedTime,
        author: {
          '@type': 'Person',
          name: metadata.article.author,
          url: metadata.article.authorUrl,
        },
        publisher: {
          '@type': 'Organization',
          name: 'AquaTerra Community',
          url: baseUrl,
        },
      };
    }

    return baseSchema;
  }

  static mapTypeToSchema(type) {
    const typeMap = {
      profile: 'Person',
      organization: 'Organization',
      article: 'BlogPosting',
      website: 'WebSite',
    };
    return typeMap[type] || 'WebPage';
  }

  static generateMetaHeaders(metadata) {
    const ogTags = this.generateOpenGraphTags(metadata);
    const jsonLD = this.generateJSONLD(metadata);

    return {
      ogTags,
      jsonLD,
      canonical: metadata.url,
      robots: 'index, follow',
      viewport: 'width=device-width, initial-scale=1.0',
    };
  }

  static buildHomePageMetadata(baseUrl) {
    return {
      title: 'AquaTerra Community Platform | Learning & Collaboration',
      description: 'Join a global community of educators and learners focused on environmental sustainability, aquatic sciences, and collaborative education.',
      image: `${baseUrl}/og-image.png`,
      url: baseUrl,
      type: 'website',
    };
  }

  static buildAboutPageMetadata(baseUrl) {
    return {
      title: 'About AquaTerra | Community Platform for Environmental Learning',
      description: 'Learn about AquaTerra\'s mission to create collaborative spaces for environmental education and scientific learning.',
      image: `${baseUrl}/og-about.png`,
      url: `${baseUrl}/about`,
      type: 'website',
    };
  }

  static generateBreadcrumbSchema(breadcrumbs) {
    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbs.map((crumb, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: crumb.name,
        item: crumb.url,
      })),
    };
  }
}

module.exports = SEOMetadata;
