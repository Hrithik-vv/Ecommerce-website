const User = require("../../models/userSchema");

// Fetch  paginated
const customerInfo = async (req, res) => {
  try {
    const search = req.query.search || ""; // Handle search query
    const page = parseInt(req.query.page) || 1; // Current page
    const limit = 10; // Items per page

    // Use `aggregate` to combine `find` and `countDocuments`
    const pipeline = [
      {
        $match: {
          isAdmin: false,
          $or: [
            { name: { $regex: ".*" + search + ".*", $options: "i" } },
            { email: { $regex: ".*" + search + ".*", $options: "i" } },
          ],
        },
      },
      { $skip: (page - 1) * limit }, // Pagination skip
      { $limit: limit }, // Pagination limit
    ];

    // Query to fetch paginated user data
    const userData = await User.aggregate(pipeline);

    // Total count for pagination (optimized query)
    const countPipeline = [
      {
        $match: {
          isAdmin: false,
          $or: [
            { name: { $regex: ".*" + search + ".*", $options: "i" } },
            { email: { $regex: ".*" + search + ".*", $options: "i" } },
          ],
        },
      },
      { $count: "total" },
    ];
    const countResult = await User.aggregate(countPipeline);
    const count = countResult.length > 0 ? countResult[0].total : 0;

    // Total pages calculation
    const totalPages = Math.ceil(count / limit);

    res.render("customers", {
      data: userData,
      totalPages,
      currentPage: page,
    });
  } catch (error) {
    console.error("Error fetching customer info:", error);
    res.redirect("/pageerror");
  }
};


// Block  customer account
const customerBlocked = async (req, res) => {
  try {
    let id = req.query.id;
    await User.updateOne({ _id: id }, { $set: { isBlocked: true } });
    res.redirect("/admin/users");
  } catch (error) {
    console.log("block error", error);

    res.redirect("/pageerror");
  }
};

// Unblock customer account
const customerunBlocked = async (req, res) => {
  try {
    let id = req.query.id;
    await User.updateOne({ _id: id }, { $set: { isBlocked: false } });
    res.redirect("/admin/users");
  } catch (error) {
    console.log(" unblock error", error);

    res.redirect("/pageerror");
  }
};

module.exports = {
  customerInfo,
  customerBlocked,
  customerunBlocked,
};
