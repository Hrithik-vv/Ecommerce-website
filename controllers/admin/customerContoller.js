const User = require("../../models/userSchema");

const customerInfo = async (req, res) => {
  try {
    const search = req.query.search || ""; 
    const page = parseInt(req.query.page) || 1; 
    const limit = 10; 

    // Match stage for search
    const matchStage = {
      isAdmin: false,
      $or: [
        { name: { $regex: ".*" + search + ".*", $options: "i" } }, 
        { email: { $regex: ".*" + search + ".*", $options: "i" } },
      ],
    };

    // Get total count
    const countPipeline = [{ $match: matchStage }, { $count: "total" }];
    const countResult = await User.aggregate(countPipeline);
    const totalDocuments = countResult.length > 0 ? countResult[0].total : 0;
    const totalPages = Math.ceil(totalDocuments / limit); 

    // Get paginated data
    const pipeline = [
      { $match: matchStage },
      { $sort: { name: 1 } }, 
      { $skip: (page - 1) * limit }, 
      { $limit: limit }, 
    ];
    const userData = await User.aggregate(pipeline);

    // Render customers template
    res.render("customers", {
      data: userData,
      totalPages,
      currentPage: page,
      search,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      nextPage: page + 1,
      prevPage: page - 1,
      lastPage: totalPages,
      totalItems: totalDocuments,
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
