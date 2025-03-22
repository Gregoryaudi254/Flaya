import { StyleSheet, Text, View,FlatList ,ImageBackground,ViewStyle} from 'react-native'
import React, { useState } from 'react'
import * as Animatable from 'react-native-animatable'

interface Story {
    thumbnail: string;
    id:string // Replace with the actual structure of your story object
   
  }
  
interface StoriesProps {
  stories: Story[];
}

interface StoryItemProps {
    activeStory: Story;
    item: Story;
  }

  const zoomIn = {
    0:{
        scale:0.9
    },
    1:{
        scale:1
    }
  }
  const zoomOut = {
    0:{
        scale:1
    },
    1:{
        scale:0.9
    }
  }

const StoriesItem :React.FC<StoryItemProps> = ({activeStory,item}) =>{
    return (
        <Animatable.View
        animation={activeStory.id === item.id ? zoomIn:zoomOut}
        style={{marginRight:5}}
        duration={500}
        >
            <ImageBackground 
            source={{uri:item.thumbnail}} 
            style={{width:200,height:200, borderRadius:10,overflow:'hidden',margin:5,shadowColor:'gray',shadowRadius:3}}/>

        </Animatable.View>
    )
}


const stories : React.FC<StoriesProps> = ({stories}) => {

  const[activeStory,setActiveStory] = useState( stories[1]) 
  
  const viewItemsChanged = ({viewItemsChanged}) => {

  }
  return (

    <FlatList
    data={stories}
    keyExtractor={(story) => story.id}
    renderItem={({item}) => (
        <StoriesItem activeStory = {activeStory} item= {item} />

    )}
    horizontal
    onViewableItemsChanged={viewItemsChanged}
    
    />
  )
}

export default stories

const styles = StyleSheet.create({})