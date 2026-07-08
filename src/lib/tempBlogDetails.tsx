// @/lib/tempBlogDetails.ts

export const blogs = {
  "free-websites-for-business": {
    id: 1,
    blogId: "free-websites-for-business",
    title: "Do business really get free website?",
    subtitle:
      "Yes, businesses can get free websites — but only the right platform makes it worthwhile",
    imageSrc: "/images/Rectangle 58.png",
    content:
      "This blog is made for builders, shippers, and entrepreneurs like you. Get insights that help businesses scale faster — from branding to deliveries, sales, and digital growth. Want to put what you learn into action? Register now and launch your website for free on our platform.",
    authorName: "Maleek Berry",
    authorImageSrc: "/path/to/author.jpg",
    publishDate: "09:23am June 24",
  },
  "scale-your-business-online": {
    id: 2,
    blogId: "scale-your-business-online",
    title: "How to scale your business online",
    subtitle:
      "Yes, businesses can get free websites — but only the right platform makes it worthwhile",
    imageSrc: "/images/Rectangle 58.png",
    content:
      "This blog is made for builders, shippers, and entrepreneurs like you. Get insights that help businesses scale faster — from branding to deliveries, sales, and digital growth. Want to put what you learn into action? Register now and launch your website for free on our platform.",
    authorName: "Maleek Berry",
    authorImageSrc: "/path/to/author.jpg",
    publishDate: "09:23am June 24",
  },
};

// Helper to get all blogs as array for the listing page
export const blogsList = Object.values(blogs);
