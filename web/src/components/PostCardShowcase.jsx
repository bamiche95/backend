import React from "react";

const Sidebar = () => (
  <div className="bg-white w-64 h-screen p-6 shadow-md hidden md:block">
    <h2 className="text-lg font-bold mb-6">📍 LocalApp</h2>
    <ul className="space-y-4 text-gray-700">
      <li className="hover:text-blue-600 cursor-pointer">🏠 Home</li>
      <li className="hover:text-blue-600 cursor-pointer">🔍 Discover</li>
      <li className="hover:text-blue-600 cursor-pointer">🛍️ Offers</li>
      <li className="hover:text-blue-600 cursor-pointer">❓ Ask Locals</li>
      <li className="hover:text-blue-600 cursor-pointer">🔔 Notifications</li>
      <li className="hover:text-blue-600 cursor-pointer">📥 Messages</li>
      <li className="hover:text-blue-600 cursor-pointer">⚙️ Settings</li>
    </ul>
  </div>
);

const PostInteractions = ({ type }) => {
  return (
    <div className="flex gap-4 text-gray-500 text-sm">
      <button>💬 Comment</button>
      {(type === "tip" || type === "discussion") && <button>👍 Like</button>}
      {(type === "offer" || type === "tip") && <button>🔖 Save</button>}
      {type === "alert" && <button>✅ Seen</button>}
      {type === "offer" && <button>📩 Message</button>}
    </div>
  );
};

const PostCard = ({ name, username, time, type, content, image }) => (
  <div className="bg-white rounded-xl shadow p-4 space-y-2">
    <div className="flex items-center justify-between">
      <div>
        <p className="font-semibold text-gray-900">
          {name} <span className="text-gray-500 text-sm ml-1">@{username}</span>
        </p>
        <p className="text-xs text-gray-400">{time}</p>
      </div>
      <span className={`text-xs px-2 py-1 rounded ${
        type === "Question" ? "bg-blue-100 text-blue-800" :
        type === "Alert" ? "bg-red-100 text-red-700" :
        type === "Offer" ? "bg-green-100 text-green-700" :
        type === "Tip" ? "bg-yellow-100 text-yellow-800" :
        "bg-gray-100 text-gray-700"
      }`}>{type}</span>
    </div>
    {image && <img src={image} alt="post visual" className="w-full h-48 object-cover rounded-md" />}
    <p className="text-gray-700 text-left">{content}</p>
    <PostInteractions type={type.toLowerCase()} />
    <input
      type="text"
      placeholder="Write a comment..."
      className="w-full border rounded p-2 text-sm"
    />
  </div>
);

export default function PostCardShowcase() {
  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 space-y-8 p-6 bg-gray-100 min-h-screen max-w-4xl mx-auto">
        <h1 className="text-xl font-bold mb-4">📌 Post Card Styles</h1>
        <PostCard
          name="Tunde Johnson"
          username="tundejo"
          time="2 hours ago"
          type="Question"
          content="Does anyone know a good plumber in Ikoyi?"
          image="https://source.unsplash.com/600x300/?plumbing"
        />
        <PostCard
          name="Kemi Obasanjo"
          username="kemi_o"
          time="Just now"
          type="Alert"
          content="Stray dog spotted on Bode Thomas."
          image="https://source.unsplash.com/600x300/?dog"
        />
        <PostCard
          name="Ugo Nwosu"
          username="ugo_sellit"
          time="10 min ago"
          type="Offer"
          content="Free baby stroller — just pick it up."
          image="https://source.unsplash.com/600x300/?baby,stroller"
        />
        <PostCard
          name="Adaeze Obi"
          username="adaeze_tips"
          time="30 min ago"
          type="Tip"
          content="Use vinegar and lemon to remove water stains on glass!"
          image="https://source.unsplash.com/600x300/?cleaning"
        />
        <PostCard
          name="Daniel Cole"
          username="dan_discuss"
          time="1 hour ago"
          type="Discussion"
          content="What do you all think about the new community center being built downtown?"
          image="https://source.unsplash.com/600x300/?community"
        />
      </main>
    </div>
  );
}
