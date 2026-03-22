import Stripe from "stripe";



try {
    console.log(process.env.STRIPL_SECRET_KEY!)
} catch(err) {
    const key = process.env.STRIPE_SECRET_KEY

    console.log(`the error in your code is that the ${key}`)
}
// export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
//   apiVersion: "2024-06-20",
// });
