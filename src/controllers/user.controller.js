export const getCurrentUser = async (req, res, next) => {
  try {
    const user = req.user;
    
    res.json({
      id: user.id,
      mobileNumber: user.mobileNumber,
      name: user.name,
      subscriptionTier: user.subscriptionTier,
      createdAt: user.createdAt
    });
  } catch (error) {
    next(error);
  }
};
