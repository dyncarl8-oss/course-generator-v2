export async function generateCourseImage(courseTitle: string): Promise<string | null> {
  try {
    console.log("Generating course image via backend...");
    
    const response = await fetch("/api/generate-course-image", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ courseTitle }),
    });

    if (!response.ok) {
      throw new Error("Failed to generate image");
    }

    const data = await response.json();
    
    if (data.imageUrl) {
      console.log("Image generated successfully:", data.imageUrl);
      return data.imageUrl;
    }

    return null;
  } catch (error) {
    console.error("Failed to generate course image:", error);
    return null;
  }
}
