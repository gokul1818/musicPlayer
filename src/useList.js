import React, { useState, useEffect } from 'react';
import { databases } from './appwrite'; // Import your Appwrite configuration

const databaseId = 'auth_123'; // Replace with your database ID
const collectionId = '66c967c800342a710ead'; // Replace with your collection ID

function DataComponent() {
    const [data, setData] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await databases.listDocuments(databaseId, collectionId);
                setData(response.documents);
            } catch (error) {
                console.error(error);
            }
        };

        fetchData();
    }, []);

    return (
        <div>
            <h2>Data from Appwrite</h2>
            <ul>
                {data.map((item) => (
                    <li key={item.$id}>{item.name}</li> // Adjust according to your data structure
                ))}
            </ul>
        </div>
    );
}

export default DataComponent;
