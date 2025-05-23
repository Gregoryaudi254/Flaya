// Import the Businesses component
import Businesses from '@/components/Businesses';

// ... existing code ...

// In the Post component where different post types are rendered
// Add this condition alongside the case for events
{post.contentType === "event" && <Events events={post.events} />}
{post.contentType === "business" && <Businesses businesses={post.businesses} />}

// ... existing code ... 