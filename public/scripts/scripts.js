document.addEventListener("DOMContentLoaded", () => {
    const likeButtons = document.querySelectorAll(".likeBtn");

    /**
     * Fetch the liked packages from the server and sync the like button states.
     */
    async function syncLikeButtonStates() {
        try {
            const response = await fetch("/api/like"); // Fetch liked packages from the server
            if (!response.ok) {
                throw new Error("Failed to fetch liked packages");
            }
            const likedPackages = await response.json();

            // Extract IDs of liked packages
            const likedPackageIds = likedPackages.map(pkg => pkg.id);

            // Update button states
            likeButtons.forEach(button => {
                const packageId = button.getAttribute("data-package-id");
                if (likedPackageIds.includes(parseInt(packageId))) {
                    button.classList.add("liked"); // Mark as liked
                } else {
                    button.classList.remove("liked"); // Remove liked state
                }
            });
        } catch (error) {
            console.error("Error syncing like button states:", error);
        }
    }

    /**
     * Attach click event listeners to each like button.
     */
    likeButtons.forEach(button => {
        button.addEventListener("click", async () => {
            const packageId = button.getAttribute("data-package-id");

            try {
                // Send request to toggle like state
                const response = await fetch("/api/like", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ packageId })
                });

                const result = await response.json();
                if (result.liked) {
                    button.classList.add("liked"); // Mark as liked
                } else {
                    button.classList.remove("liked"); // Remove liked state
                }
            } catch (error) {
                console.error("Error updating like status:", error);
            }
        });
    });

   
    async function fetchLikedPackages() {
        // try {
            const response = await fetch("/api/like");
            
            if (!response.ok) {
                const errorText = await response.text(); // Capture response details
                console.error("Server Error Response:", errorText);
                throw new Error(`Failed to fetch liked packages: ${response.status} ${response.statusText}`);
            }
    
            const likedPackages = await response.json();
            console.log("Fetched liked packages:", likedPackages); // Log retrieved data
            displayLikedPackages(likedPackages);
        // } catch (error) {
            console.error("Error fetching liked packages:", error);
            alert("Unable to load liked packages. Check console for details.");
        // }
    }
    

    /**
     * Dynamically render liked packages in the UI.
     * @param {Array} likedPackages
     */
    // function displayLikedPackages(likedPackages) {
    //     const likedSection = document.querySelector("#liked-packages");
    //     likedSection.innerHTML = ""; // Clear previous content

    //     likedPackages.forEach(pkg => {
    //         const packageCard = document.createElement("div");
    //         packageCard.classList.add("package-card");

    //         packageCard.innerHTML = `
    //             <div class="img-holder">
    //                 <img src="${pkg.image_url}" alt="${pkg.name}" class="package-image" />
    //             </div>
    //             <h3 class="package-name">${pkg.name}</h3>
    //             <p class="package-price">$${pkg.price}</p>
    //             <a href="/book" class="btn-primary">View</a>
    //         `;

    //         likedSection.appendChild(packageCard);
    //     });
    // }

 
    syncLikeButtonStates();

   
    fetchLikedPackages();
});


// async function fetchAppointments() {
//     const response = await fetch("/api/appointments");
//     const appointments = await response.json();

//     const list = document.getElementById("appointmentsList");
//     list.innerHTML = "";

//     appointments.forEach((appointment) => {
//         const listItem = document.createElement("li");
//          const dateTime = new Date(appointment.date_time); // Assuming date_time exists
//     const date = dateTime.toLocaleDateString(); // Format: "MM/DD/YYYY"
//     const time = dateTime.toLocaleTimeString(); // Format: "HH:MM:SS AM/PM"

//     listItem.innerHTML = `
//         <h2>Your Appointments</h2>
//         <section class="appointments-section">
//             <ul class="appointment-list">
//                 <li class="appointment-card">
//                     <div class="appointment-info">
//                         <h3>${appointment.name}</h3>
//                         <p><strong>DATE:</strong> ${date}</p>
//                         <p><strong>TIME:</strong> ${time}</p>
//                         <button onclick="cancelAppointment(${appointment.id})" class="cancel-btn">Cancel</button>
//                     </div>
//                 </li>
//             </ul>
//         </section>
//     `;
//     list.appendChild(listItem);
// }
//     ); }

// async function cancelAppointment(appointmentId) {
//     await fetch(`/api/appointments/${appointmentId}`, { method: "DELETE" });
//     fetchAppointments();
// }



// fetchAppointments();