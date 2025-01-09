import React, { useState, useEffect } from 'react';
    import './App.css';

    const App = () => {
      const [tweets, setTweets] = useState([]);
      const [newTweet, setNewTweet] = useState('');
      const [currentUser, setCurrentUser] = useState(null);
      const [viewingUser, setViewingUser] = useState(null);
      const [users, setUsers] = useState([]);
      const [showLogin, setShowLogin] = useState(true);
      const [newUsername, setNewUsername] = useState('');
      const [showCreateUser, setShowCreateUser] = useState(false);
      const [error, setError] = useState('');
      const [replyingTo, setReplyingTo] = useState(null);
      const [replies, setReplies] = useState({});

      useEffect(() => {
        fetchTweets();
        fetchUsers();
      }, [viewingUser]);

      const fetchTweets = async () => {
        const url = viewingUser 
          ? `http://localhost:3001/api/tweets?username=${viewingUser}`
          : 'http://localhost:3001/api/tweets';
        
        const response = await fetch(url);
        const data = await response.json();
        setTweets(data);
      };

      const fetchReplies = async (tweetId) => {
        const response = await fetch(`http://localhost:3001/api/tweets/${tweetId}/replies`);
        const data = await response.json();
        setReplies(prev => ({ ...prev, [tweetId]: data }));
      };

      const fetchUsers = async () => {
        const response = await fetch('http://localhost:3001/api/users');
        const data = await response.json();
        setUsers(data);
      };

      const postTweet = async (parentTweetId = null) => {
        if (!newTweet || !currentUser) return;
        
        await fetch('http://localhost:3001/api/tweets', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: newTweet,
            username: currentUser,
            parent_tweet_id: parentTweetId
          })
        });

        setNewTweet('');
        setReplyingTo(null);
        fetchTweets();
        if (parentTweetId) {
          fetchReplies(parentTweetId);
        }
      };

      const deleteTweet = async (tweetId) => {
        if (!window.confirm('Are you sure you want to delete this tweet?')) return;

        try {
					console.log(`Username for delete : ${currentUser}`);
              const response = await fetch(
					      `http://localhost:3001/api/tweets/${tweetId}/${currentUser}`, 
					      {
					        method: 'DELETE'
					      }
					    );

          if (!response.ok) {
            throw new Error('Failed to delete tweet');
          }

          fetchTweets();
          if (replyingTo) {
            fetchReplies(replyingTo);
          }
        } catch (err) {
          console.error('Error deleting tweet:', err);
          alert('Failed to delete tweet');
        }
      };

      const createUser = async () => {
        if (!newUsername) {
          setError('Username is required');
          return;
        }

        try {
          const response = await fetch('http://localhost:3001/api/users', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              username: newUsername
            })
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error);
          }

          setNewUsername('');
          setShowCreateUser(false);
          setError('');
          fetchUsers();
        } catch (err) {
          setError(err.message);
        }
      };

      const handleLogin = (username) => {
        setCurrentUser(username);
        setViewingUser(username);
        setShowLogin(false);
      };

      const handleUserSwitch = () => {
        setCurrentUser(null);
        setViewingUser(null);
        setShowLogin(true);
      };

      const toggleReplies = async (tweetId) => {
        if (!replies[tweetId]) {
          await fetchReplies(tweetId);
        } else {
          setReplies(prev => ({ ...prev, [tweetId]: null }));
        }
      };

      if (showLogin) {
        return (
          <div className="login-container">
            <h1>Welcome to Twitter Clone</h1>
            <div className="user-list">
              {users.map(user => (
                <button 
                  key={user} 
                  className="user-button"
                  onClick={() => handleLogin(user)}
                >
                  Login as {user}
                </button>
              ))}
              <button 
                className="user-button create-user"
                onClick={() => setShowCreateUser(true)}
              >
                Create New User
              </button>
            </div>

            {showCreateUser && (
              <div className="create-user-form">
                <input
                  type="text"
                  placeholder="Enter new username"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                />
                <button onClick={createUser}>Create User</button>
                <button onClick={() => setShowCreateUser(false)}>Cancel</button>
                {error && <div className="error">{error}</div>}
              </div>
            )}
          </div>
        );
      }

      return (
        <div className="app">
          <div className="header">
            <h1>Twitter Clone</h1>
            <div className="user-controls">
              <span>Logged in as: {currentUser}</span>
              <button onClick={handleUserSwitch}>Switch User</button>
            </div>
          </div>

          <div className="tweet-form">
            <textarea
              placeholder={replyingTo ? `Replying to tweet #${replyingTo}` : "What's happening?"}
              value={newTweet}
              onChange={(e) => setNewTweet(e.target.value)}
            />
            <button onClick={() => postTweet(replyingTo)}>
              {replyingTo ? 'Reply' : 'Tweet'}
            </button>
            {replyingTo && (
              <button 
                className="cancel-reply"
                onClick={() => setReplyingTo(null)}
              >
                Cancel Reply
              </button>
            )}
          </div>

          <div className="user-filter">
            <button 
              className={!viewingUser ? 'active' : ''}
              onClick={() => setViewingUser(null)}
            >
              All Tweets
            </button>
            {users.map(user => (
              <button
                key={user}
                className={viewingUser === user ? 'active' : ''}
                onClick={() => setViewingUser(user)}
              >
                {user}'s Tweets
              </button>
            ))}
          </div>

          <div className="tweets">
            {tweets.map(tweet => (
              <div key={tweet.id} className="tweet">
                <div className="tweet-header">
                  <span className="username">{tweet.username}</span>
                  <span className="timestamp">
                    {new Date(tweet.created_at).toLocaleString()}
                  </span>
                  {tweet.username === currentUser && (
                    <button 
                      className="delete-tweet"
                      onClick={() => deleteTweet(tweet.id)}
                    >
                      🗑️
                    </button>
                  )}
                </div>
                <div className="content">{tweet.content}</div>
                
                <div className="tweet-actions">
                  <button 
                    className="reply-button"
                    onClick={() => setReplyingTo(tweet.id)}
                  >
                    Reply
                  </button>
                  {tweet.reply_count > 0 && (
                    <button
                      className="view-replies"
                      onClick={() => toggleReplies(tweet.id)}
                    >
                      {replies[tweet.id] ? 'Hide' : 'View'} Replies ({tweet.reply_count})
                    </button>
                  )}
                </div>

                {replies[tweet.id] && (
                  <div className="replies">
                    {replies[tweet.id].map(reply => (
                      <div key={reply.id} className="reply">
                        <div className="reply-header">
                          <span className="username">{reply.username}</span>
                          <span className="timestamp">
                            {new Date(reply.created_at).toLocaleString()}
                          </span>
                        </div>
                        <div className="content">{reply.content}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      );
    };

    export default App;
