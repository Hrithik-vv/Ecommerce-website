document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("pay-button").addEventListener("click", async function () {
      const response = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: 500, currency: "INR" }), // Change amount as needed
      });
  
      const order = await response.json();
      
      const options = {
        key: "YOUR_RAZORPAY_KEY_ID",
        amount: order.amount,
        currency: order.currency,
        name: "Your Store",
        description: "Payment",
        order_id: order.id,
        handler: async function (response) {
          const verifyRes = await fetch("/api/payment/verify-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(response),
          });
  
          const verifyData = await verifyRes.json();
          if (verifyData.success) {
            alert("Payment successful!");
            window.location.href = "/order-success";
          } else {
            alert("Payment failed!");
          }
        },
        theme: { color: "#3399cc" },
      };
  
      const rzp = new Razorpay(options);
      rzp.open();
    });
  });
  