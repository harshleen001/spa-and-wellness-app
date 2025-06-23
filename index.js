import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import env from "dotenv";
env.config(); // Load .env before using process.env

import pg from "pg";
import bodyParser from "body-parser";
import { exists } from "fs";
import session from "express-session";
import bcrypt from "bcrypt";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 8080;
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(session({
    secret: "your_secret_key",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true if using HTTPS
}));

const db = new pg.Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432, // Ensure port is a number
});
db.connect();

app.use(express.json());

app.use(bodyParser.json());
app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended: true}));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public/home.html"));
});

app.get("/home", (req, res) => {
    if (req.session.user) {
        res.sendFile(path.join(__dirname, "public/home.html"));
    } else {
        res.sendFile(path.join(__dirname, "public/home.html"));
    }
});

app.get("/book", (req, res) => {
    if (req.session.user) {
        res.sendFile(path.join(__dirname, "public/book.html"));
    } else {
        res.sendFile(path.join(__dirname, "public/login.html"));
    }
});


app.get("/about", (req, res) => {
    res.sendFile(path.join(__dirname, "public/about.html"));
});

app.get("/contact", (req, res) => {
    res.sendFile(path.join(__dirname, "public/contact.html"));
});

app.get("/login", (req, res) => {
    res.sendFile(path.join(__dirname, "public/login.html"));
});
app.get("/register", (req, res) => {
    res.sendFile(path.join(__dirname, "public/register.html"));
});

app.get("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.log(err);
        } else {
            res.redirect("/home");
        }
    });
});


app.get("/profile", async (req, res) => {
    if (!req.session.user) {
        return res.redirect("/login");
    }
    try {
        const userInfo = req.session.user;

        // Fetch liked packages
        const likedPackagesResult = await db.query(
            `SELECT packages.id, packages.name, packages.price, packages.image_url
             FROM liked_packages 
             JOIN packages ON liked_packages.package_id = packages.id
             WHERE user_email = $1`,
            [userInfo.email]
        );
        const likedPackages = likedPackagesResult.rows;

        // Fetch appointments
        const appointmentsResult = await db.query(
            `SELECT appointments.id, appointments.date, appointments.notes, packages.name AS package_name, packages.price
             FROM appointments
             JOIN packages ON appointments.package_id = packages.id
             WHERE appointments.user_email = $1
             ORDER BY appointments.date DESC`,
            [userInfo.email]
        );
        const appointments = appointmentsResult.rows;

        res.render("profile.ejs", {
            userInfo: userInfo,
            likedPackages,
            appointments
        });
    } catch (err) {
        console.error("Error loading profile:", err);
        res.status(500).send("Error loading profile.");
    }
});

app.get("/change-password", (req, res) => {
    if (req.session.user) {
        res.sendFile(path.join(__dirname, "public/change-password.html"));
    } else {
        res.redirect("/login");
    }
});

app.get("/forgot-password", (req, res) => {
    res.sendFile(path.join(__dirname, "public/forgot-password.html"));
});

app.get('/api/like', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Unauthorized - No session user' });
    }

    const userEmail = req.session.user.email;

    try {
        const likedPackages = await db.query(
            `SELECT packages.id, packages.name, packages.price, packages.image_url
             FROM liked_packages 
             JOIN packages ON liked_packages.package_id = packages.id
             WHERE user_email = $1`,
            [userEmail]
        );

        res.json(likedPackages.rows); // Send package details to the frontend
    } catch (err) {
        console.error('Database Error:', err);
        res.status(500).json({ error: 'Failed to fetch liked packages' });
    }
});

app.get("/api/appointments", async (req, res) => {
    try {
        const result = await db.query("SELECT packages.id,packages.name,packages.price FROM appointments JOIN packages ON appointments.package_id = packages.id where user_email = $1", [req.session.user.email]);
           console.log("Fetched appointments:", result.rows);
        res.json(result.rows[0]);
    } catch (error) {
        console.error("Error fetching appointments:", error);
        res.status(500).json({ message: "Failed to fetch appointments" });
    }
});



app.post('/cancel-appointment', async (req, res) => {
    const { id } = req.body;
    try {
        await db.query('DELETE FROM appointments WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        res.json({ success: false });
    }
});


app.post("/register", async (req, res) => {
    const { name, email, password, password2 } = req.body;

    if (password !== password2) {
        return res.send("<script>alert('Passwords do not match. Try again.'); window.location.href = '/register';</script>");
    }
 
    try {
        const checkUser = await db.query("SELECT * FROM users WHERE email = $1", [email]);
        if (checkUser.rows.length > 0) {
            return res.send("<script>alert('Email already exists. Want to login?'); window.location.href = '/login';</script>");
        }

        const hashedPassword = await bcrypt.hash(password, 10); 
        await db.query("INSERT INTO users (name, email, password) VALUES ($1, $2, $3)", [name, email, hashedPassword]);

        res.redirect("/login");
    } catch (err) {
        console.error(err);
        res.send("An error occurred. Please try again.");
    }
});


app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    try {
        const result = await db.query("SELECT * FROM users WHERE email = $1", [email]);

        if (result.rows.length > 0) {
            const user = result.rows[0];

            const passwordMatch = await bcrypt.compare(password, user.password);
            if (passwordMatch) {
                req.session.user = { email: user.email, name: user.name }; 
                return res.redirect("/profile");
            } else {
                return res.send("<script>alert('Wrong password. Try again.'); window.location.href = '/login';</script>");
            }
        } else {
            return res.send("<script>alert('User not found. Please register.'); window.location.href = '/register';</script>");
        }
    } catch (err) {
        console.log(err);
        res.send("An error occurred. Please try again.");
    }
});
app.post("/change-password", async (req, res) => {
    if (!req.session.user) {
        return res.redirect("/login");
    }

    const userEmail = req.session.user.email.toLowerCase();
    const currentPassword = req.body.password;
    const newPassword = req.body.password1;
    const confirmPassword = req.body.password2;

    console.log("Email:", userEmail);
    console.log("Current Password:", currentPassword);
    console.log("New Password:", newPassword);
    console.log("Confirm Password:", confirmPassword);

    if (newPassword !== confirmPassword) {
        return res.send("<script>alert('Passwords do not match. Try again.'); window.location.href = '/change-password';</script>");
    }

    try {
   
        const result = await db.query("SELECT password FROM users WHERE email = $1", [userEmail]);
        console.log("Query Result:", result.rows);
        if (result.rows.length === 0) {
            return res.send("<script>alert('User not found.'); window.location.href = '/login';</script>");
        }

        const storedPassword = result.rows[0].password;

       
        const passwordMatch = await bcrypt.compare((currentPassword), (storedPassword));
        if (!passwordMatch) {
            return res.send("<script>alert('Incorrect current password. Try again.'); window.location.href = '/change-password';</script>");
        }

     
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        
        await db.query("UPDATE users SET password = $1 WHERE email = $2", [hashedPassword, userEmail]);

        res.send("<script>alert('Password updated successfully!'); window.location.href = '/profile';</script>");

    } catch (err) {
        console.error(err);
        res.send("An error occurred. Please try again.");
    }
});

app.post("/forgot-password", async (req, res) => {
    const email = req.body.email.toLowerCase();
    const newPassword = req.body.password1;
    const confirmPassword = req.body.password2;

    if (newPassword !== confirmPassword) {
        return res.send("<script>alert('Passwords do not match. Try again.'); window.location.href = '/forgot-password';</script>");
    }

    try {
        const result = await db.query("SELECT * FROM users WHERE email = $1", [email.toLowerCase()]);
        if (result.rows.length === 0) {
            return res.send("<script>alert('User not found.'); window.location.href = '/register';</script>");
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await db.query("UPDATE users SET password = $1 WHERE email = $2", [hashedPassword, email.toLowerCase()]);

        res.send("<script>alert('Password reset successfully!'); window.location.href = '/login';</script>");
    } catch (err) {
        console.error(err);
        res.send("An error occurred. Please try again.");
    }
});


app.post("/api/like", async (req, res) => {
    console.log("📩 Incoming request body:", req.body);

    const { packageId } = req.body;
    if (!packageId) {
        console.error("❌ packageId is missing in the request body");
        return res.status(400).json({ message: "Missing packageId" });
    }
    if (!req.session.user) {
        return res.status(401).json({ message: "User not logged in" });
    }

    // const { packageId } = req.body;
    const userEmail = req.session.user.email;

    if (!packageId) {
        return res.status(400).json({ message: "Missing packageId" });
    }

    try {
        const check = await db.query(
            "SELECT * FROM liked_packages WHERE user_email = $1 AND package_id = $2",
            [userEmail, packageId]
        );

        if (check.rows.length > 0) {
            await db.query("DELETE FROM liked_packages WHERE user_email = $1 AND package_id = $2", [userEmail, packageId]);
            return res.json({ liked: false });
        } else {
            await db.query("INSERT INTO liked_packages (user_email, package_id) VALUES ($1, $2)", [userEmail, packageId]);
            return res.json({ liked: true });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error processing like action" });
    }
});



app.post("/api/appointments", async (req, res) => {
        const userEmail = req.session.user.email;

    const { packageId, packageName, name, dateTime, notes } = req.body;

    try {
        await db.query(
            "INSERT INTO appointments (user_email,package_id,date,notes) VALUES ($1, $2, $3, $4) RETURNING *",
            [userEmail,packageId, dateTime, notes]
        );
        const result = await db.query(
            "SELECT * FROM appointments JOIN packages on package_id=packages.id WHERE user_email = $1 AND package_id = $2 ORDER BY appointments.id DESC LIMIT 1",
            [userEmail, packageId]
        );
        console.log("Appointment booked:", result.rows[0]);
        res.json({ success: true, appointment: result.rows[0] });
    } catch (error) {
        console.error("Error booking appointment:", error);
        res.status(500).json({ success: false, message: "Failed to book appointment" });
    }
});


app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
