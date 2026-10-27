import json
from app.hairball3.plugin import Plugin
import app.consts_drscratch as consts
from app.hairball3.scriptObject import Script
import logging
import coloredlogs

logger = logging.getLogger(__name__)
coloredlogs.install(level='DEBUG', logger=logger)

# Objetivos: numero total de sprites, una entrada por sprite (ciudad), cada edificio un script, y la altura del edificio la cantidad de bloques 

class Babia(Plugin):

    def __init__(self, filename: str, json_project,verbose=False):
        super().__init__(filename, json_project, verbose)
       
        self.babia_dict = {}
        self.sprite_dict = {}
        self.babia_dict['num_sprites'] = 0
        self.babia_dict['sprites'] = {}

    def get_blocks(self, dict_target):
        """
        Gets all the blocks in json format into a dictionary
        """
        out = {}


        for dict_key, dicc_value in dict_target.items():
            if dict_key == "blocks":
                for blocks, blocks_value in dicc_value.items():
                    if type(blocks_value) is dict:
                        out[blocks] = blocks_value

        return out
        

    def set_sprite_dict(self):
        """
        Sets a dictionary containing the scripts of each sprite in Script() format
        """
            
        for key, list_dict_targets in self.json_project.items():
            if key == "targets":
                for dict_target in list_dict_targets:
                    sprite_name = dict_target['name']
                    sprite_blocks = self.get_blocks(dict_target)

                    sprite_scripts = []

                    for key, block in sprite_blocks.items():
                        if block["topLevel"]:
                            new_script = Script()
                            new_script.set_script_dict(block_dict=sprite_blocks, start=key)
                            #print(new_script.convert_to_text())
                            sprite_scripts.append(new_script)

                    self.sprite_dict[sprite_name] = sprite_scripts

                    

                    for sprite_name, scripts in self.sprite_dict.items():
                        for script in scripts:
                            pass
        
        return self.sprite_dict

    def process(self):
        block_list = []
        # print(self.json_project.items())

        for key, list_info in self.json_project.items():
            if key == "targets":
                for dict_target in list_info:
                    currScript = 0
                    self.babia_dict['num_sprites'] += 1
                    self.babia_dict['sprites'][dict_target['name']] = {}
                    for dicc_key, dicc_value in dict_target.items():
                        if dicc_key == "blocks":
                            for blocks, blocks_value in dicc_value.items():
                                if type(blocks_value) is dict and blocks_value['topLevel']:
                                    currScript += 1
                                    script = Script()
                                    script.set_script_dict(block_dict=dicc_value, start=blocks)
                                    script_text = script.convert_to_text()
                                    self.babia_dict['sprites'][dict_target['name']][f'script_{currScript}'] = script_text

        """
        for block in self.list_total_blocks:
            for key, list_info in block.items():
                if key == "opcode":
                    self.dict_blocks[list_info] += 1
                    self.total_blocks += 1
        """
    
    def normal(self):
        max_script_len = 0 
        min_script_len = 0

        for sprite_idx, sprite in enumerate(self.babia_dict['sprites'].values()):
            for script_idx, script_len in enumerate(sprite.values()):
                if (sprite_idx == 0) and (script_idx == 0):
                    max_script_len = min_script_len = script_len
                if script_len > max_script_len:
                    max_script_len = script_len
                if script_len < min_script_len:
                    min_script_len = script_len
        #print("mi max:", max_script_len)
        #print("mi min:", min_script_len)

        
        for sprite_idx, (sprite_name, sprite_value) in enumerate(self.babia_dict['sprites'].items()):
            #print(sprite_name)
            #print(sprite_value)
            for script_idx, (script_name, script_len) in enumerate(sprite_value.items()):
                
                script_len = (script_len - min_script_len)/(max_script_len - min_script_len)
                #print(script_name, script_len, self.babia_dict['sprites'][sprite_name][script_name])
                self.babia_dict['sprites'][sprite_name][script_name] = script_len
        


    def finalize(self) -> dict:
        #self.set_sprite_dict()
        self.process()
        #self.normal()

        return self.babia_dict
